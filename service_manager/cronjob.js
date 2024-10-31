import { getAppByServiceName, getAppVmHostNameByServiceName, getNodes, getCatalogNodes, getServiceByTag } from "./consul.js"
import { getHostResource } from "./datadog.js";
import addLog from "./logsNmetrics.js";
import axios from 'axios'
import MetricsModel from "./MetricsModel.js";
import connectDB from "./database.js";
import pako from 'pako';
import dotenv from 'dotenv';



dotenv.config()




function compressString(inputString) {
    const textEncoder = new TextEncoder();
    const inputUint8Array = textEncoder.encode(inputString);
    const compressed = pako.gzip(inputUint8Array);

    return compressed;
}







export const scheduledAppMetrics = async () => {

    const servicesWithTags = await getServiceByTag("app");

    for (const service of Object.keys(servicesWithTags)) {

        console.log("starting metrics gathering for service ", service)

        const app = await getAppByServiceName(service);

        if (app.status === 'critical') {
            console.log("service in critical status, skipping...")
            continue;
        }

        console.log("starting to grab metrics from ", app.address)

        const actuatorResponseHTTP = await callActuator(app.address, "http.server.requests")
        const actuatorResponseUpTime = await callActuator(app.address, "process.uptime")
        const actuatorResponseBootTime = await callActuator(app.address, "application.started.time")
        const actuatorResponseCpuUsage = await callActuator(app.address, "system.cpu.usage")
        const actuatorResponseDiskFree = await callActuator(app.address, "disk.free")
        const actuatorResponseThreadsPeak = await callActuator(app.address, "jvm.threads.peak")

        let requestCount = 0;
        let requestTotalTime = 0;
        let requestMaxTime = 0;
        let processUpTime = 0;
        let bootTime = 0;
        let cpuUsage = 0;
        let freeDisk = 0;
        let threadsPeak = 0;


        requestCount = actuatorResponseHTTP.find(measurement => measurement.statistic === "COUNT").value
        requestTotalTime = actuatorResponseHTTP.find(measurement => measurement.statistic === "TOTAL_TIME").value
        requestMaxTime = actuatorResponseHTTP.find(measurement => measurement.statistic === "MAX").value
        processUpTime = actuatorResponseUpTime.find(measurement => measurement.statistic === "VALUE").value
        bootTime = actuatorResponseBootTime.find(measurement => measurement.statistic === "VALUE").value
        cpuUsage = actuatorResponseCpuUsage.find(measurement => measurement.statistic === "VALUE").value
        freeDisk = actuatorResponseDiskFree.find(measurement => measurement.statistic === "VALUE").value
        threadsPeak = actuatorResponseThreadsPeak.find(measurement => measurement.statistic === "VALUE").value


        let appServers = await getCatalogNodes(app.serverIp.trim());
        // appServers = replaceStringInList(appServers, "test_client", "azure-CT91HL3") // workaround for a client consul agent on the same host as the server(azure) //todo: add this inside the function!
        const appServer = appServers[0];

        // server
        const resourceValueServer1 = await getHostResource(appServer.hostname, `system.mem.free{host:${appServer.hostname}}`,)
        const resourceValueServer2 = await getHostResource(appServer.hostname, `system.mem.used{host:${appServer.hostname}}`,)
        const resourceValueServer3 = await getHostResource(appServer.hostname, `system.mem.total{host:${appServer.hostname}}`,)
        console.log(`system.mem.free{host:${appServer.hostname}} - `, resourceValueServer1)
        console.log(`system.mem.used{host:${appServer.hostname}} - `, resourceValueServer2)
        console.log(`system.mem.total{host:${appServer.hostname}} - `, resourceValueServer3)
        console.log('------------------------------------------------------------------------')



        let resourceValueAppVM1 = null;
        let resourceValueAppVM2 = null;
        let resourceValueAppVM3 = null;
        // appVM -> skip daca service e container
        if (servicesWithTags[service].includes("app-vm")) {
            const appVmHost = await getAppVmHostNameByServiceName(service)

            resourceValueAppVM1 = await getHostResource(appVmHost.hostName, `system.mem.free{host:${appVmHost.hostName}}`,)
            resourceValueAppVM2 = await getHostResource(appVmHost.hostName, `system.mem.used{host:${appVmHost.hostName}}`,)
            resourceValueAppVM3 = await getHostResource(appVmHost.hostName, `system.mem.total{host:${appVmHost.hostName}}`,)
            console.log(`system.mem.free{host:${appVmHost.hostName}} - `, resourceValueAppVM1)
            console.log(`system.mem.used{host:${appVmHost.hostName}} - `, resourceValueAppVM2)
            console.log(`system.mem.total{host:${appVmHost.hostName}} - `, resourceValueAppVM3)
            console.log('------------------------------------------------------------------------')
        }


        const metrics = {
            timestamp: Date.now(),
            appName: service,
            serverName: appServer.hostname,
            memoryUnit: "bytes",
            requestCount: requestCount,
            requestTotalTime: requestTotalTime,
            requestMaxTime: requestMaxTime,
            serverRAMFree: resourceValueServer1,
            serverRAMUsed: resourceValueServer2,
            serverRAMTotal: resourceValueServer3,
            appVmRAMFree: resourceValueAppVM1,
            appVmRAMUsed: resourceValueAppVM2,
            appVmRAMTotal: resourceValueAppVM3,
            processUpTime: processUpTime,
            bootTime: bootTime,
            cpuUsage: cpuUsage,
            freeDisk: freeDisk,
            threadsPeak: threadsPeak
        }
        const metrics2 = {
            t: Date.now(),
            an: service,
            sn: appServer.hostname,
            mu: "bytes",
            rc: requestCount,
            rt: requestTotalTime,
            rm: requestMaxTime,
            srf: resourceValueServer1,
            sru: resourceValueServer2,
            srt: resourceValueServer3,
            arf: resourceValueAppVM1,
            aru: resourceValueAppVM2,
            art: resourceValueAppVM3,
            put: processUpTime,
            bt: bootTime,
            cu: cpuUsage,
            fd: freeDisk,
            tp: threadsPeak
        }
        console.log(metrics)


        const onChainMetrics = {
            ...metrics2,
            c: "gzip"
        }
        const exampleString = JSON.stringify(onChainMetrics);
        const compressedData = compressString(exampleString);

        console.log(`Original size: ${new TextEncoder().encode(exampleString).length} bytes`);
        console.log(`Compressed size: ${compressedData.length} bytes`);
        console.log(new TextEncoder().encode(exampleString))
        console.log(compressedData)

        console.log("about to log metrics on chain at ", app.metricsAddress)
        await addLog(appVmHost.metricsAddress, JSON.stringify(onChainMetrics))

        await MetricsModel.create(metrics)
    }


}

const callActuator = async (serviceAddress, metric) => {
    try {
        const response = await axios.get(`${serviceAddress}/actuator/metrics/${metric}`);

        return response.data.measurements
    } catch (error) {
        console.error('Error fetching services:', error);
    }
}

function replaceStringInList(list, oldString, newString) {
    return list.map(item => item.hostname === oldString ? { hostname: newString, ip: item.ip } : item);
}


