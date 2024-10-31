import { client, v1 } from '@datadog/datadog-api-client';
import { getNodes } from './consul.js';



const dd_api_key_auth = "key";
const dd_app_key_auth = "key";

// datadog config
const configurationOpts = {
    authMethods: {
        apiKeyAuth: dd_api_key_auth,
        appKeyAuth: dd_app_key_auth
    },
};
const configuration = client.createConfiguration(configurationOpts);
configuration.setServerVariables({
    site: "datadoghq.eu"
});
const apiInstance = new v1.MetricsApi(configuration)



function replaceStringInList(list, oldString, newString) {
    return list.map(item => item.hostname === oldString ? { hostname: newString, ip: item.ip, geolocation: item.geolocation, checks: item.checks } : item);
}


const findBestServer = async (vmType, geolocation) => {


    //call consul at /health/service/vm-service

    let servers = await getNodes("vm-service");
    servers = replaceStringInList(servers, "test_client", "azure-CT91HL3") // workaround for a client consul agent on the same host as the server(azure)
    // hosts = [{ hostname: "test_client", ip: "192.168.68.100"}]
    console.log("servers final = ", servers);


    // filter into vms that have all checks passing


    servers = servers.filter(server => {
        let checksArePassing = true;
        for (const check of server.checks) {
            if (check.Status !== 'passing') {
                checksArePassing = false;
                break;
            }
        }

        return checksArePassing;
    })


    let serversData = []
    for (const server of servers) {

        const freeMemory = await getServerResource('system.mem.free', server.hostname)
        const usedMemory = await getServerResource('system.mem.used', server.hostname)
        const numCores = await getServerResource('system.cpu.num_cores', server.hostname)

        if (!freeMemory || !usedMemory || !numCores) return null;


        const totalMemory = freeMemory + usedMemory;
        const memoryAvailability = freeMemory / totalMemory;

        serversData.push({
            serverName: server.hostname,
            geolocation: server.geolocation,
            freeMemory: freeMemory,
            memoryAvailability: memoryAvailability,
            cores: numCores,
            ip: server.ip
        })
    }

    console.log('after resource gathering')
    console.log(serversData)


    if (vmType === 'cpu') {
        serversData = serversData.filter(server => server.cores >= 4 && server.freeMemory >= 4 * 1024 * 1024 * 1024);
    } else {
        if (vmType === 'memory') {
            serversData = serversData.filter(server => server.cores >= 2 && server.freeMemory >= 8 * 1024 * 1024 * 1024);
        } else {
            serversData = serversData.filter(server => server.cores >= 4 && server.freeMemory >= 2 * 1024 * 1024 * 1024);
        }
    }


    serversData.sort((a, b) => b.memoryAvailability - a.memoryAvailability);

    // console.log('after vmtype filtering')
    // console.log(serversData)

    let geoFilteredServers = [];
    if (geolocation) geoFilteredServers = serversData.filter(server => server.geolocation === geolocation)

    console.log('after geolocation filtering')
    console.log(geoFilteredServers)

    let bestServer;
    if (geoFilteredServers.length > 0) {
        console.log("matching geolocation!!")
        bestServer = geoFilteredServers[0];
    } else {
        if (serversData.length > 0) {
            {
                console.log("not matching geolocation!!")
                bestServer = serversData[0];
            }
        } else {
            console.log("no available server found")
            return null;
        }
    }

    console.log("best server")
    console.log(bestServer)

    return bestServer; // caller should null-check
}


async function getServerResource(resource, serverName) {
    const serverParam = {
        from: Math.round(
            new Date(new Date().getTime() + -1 * 86400 * 1000).getTime() / 1000
        ),
        to: Math.round(new Date().getTime() / 1000),

        query: `${resource}{host:${serverName}}`,
    }
    // console.log("param for host ", serverName, serverParam)


    const serverData = await apiInstance.queryMetrics(serverParam) // todo: error handling
    // console.log('server data for server ', serverParam)
    // console.log(serverData)


    if (serverData.series.length > 0) {
        return serverData.series[0].pointlist.slice(-1)[0][1];
    }

    return null;
}

export async function findAvailableServer(vmType, repoUrl, lastCommitHash, redeployment, metricsAddress, port, geolocation, publicUrl, contractAddress) {

    // todo: refactor this method, split concerns
    const bestServer = await findBestServer(vmType, geolocation)

    const deployParams = {
        vmType: vmType,
        repoUrl: repoUrl,
        lastCommitHash: lastCommitHash,
        redeployment: redeployment,
        metricsAddress: metricsAddress,
        port: port,
        publicUrl: publicUrl,
        contractAddress: contractAddress
    }

    if (bestServer) {
        await deployToServer(`http://${bestServer.ip}:3001/deploy`, deployParams)
    }

    return bestServer;
}


export const getHostResource = async (hostName, resource) => {
    const results = [];

    // todo: adjust logic 

    const hostParam = {
        from: Math.round(
            new Date(new Date().getTime() + -1 * 86400 * 1000).getTime() / 1000 
        ),
        to: Math.round(new Date().getTime() / 1000),

        // query: "system.mem.total{*}",
        query: resource,
        // query: `system.mem.free{host:${hostName}}`,
        // query: "system.mem.used{*}",
    }
    // console.log("param for host ", hostName, hostParam)


    const hostData = await apiInstance.queryMetrics(hostParam) // todo: error handling
    // console.log('host data for host ', hostName)
    // console.log(hostData)

    let resourceValue = null;
    if (hostData.series.length > 0) {
        resourceValue = hostData.series[0].pointlist.slice(-1)[0][1];
    }


    return resourceValue;
}


async function deployToServer(baseUrl, params) {
    const queryString = new URLSearchParams(params).toString();
    const urlWithParams = `${baseUrl}?${queryString}`;

    try {
        const response = await fetch(urlWithParams);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        // const data = response.body
        const data = await response.json();
        console.log('Success:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
        //todo: error handling
    }
}

export async function destroyVm(baseUrl, params) {
    const queryString = new URLSearchParams(params).toString();
    const urlWithParams = `${baseUrl}?${queryString}`;

    try {
        const response = await fetch(urlWithParams);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        // const data = response.body
        const data = await response.json();
        console.log('Success:', data);
        return data;
    } catch (error) {
        console.error('Error:', error);
        // todo: error handling
    }
}



