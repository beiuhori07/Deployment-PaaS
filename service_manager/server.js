import express from "express";
import fs from "fs";
import dotenv from 'dotenv';
import pipelineCheck from "./callApi.js"
import addLog from './logsNmetrics.js'
import cron from 'node-cron';
import { findAvailableServer, destroyVm } from "./datadog.js";
import { getServiceNodes } from "./consul.js";
import connectDB from './database.js';
import DeploymentModel from "./DeploymentModel.js";
import Buffer from 'buffer';
import { scheduledAppMetrics } from "./cronjob.js"

dotenv.config();

const BufferB = Buffer.Buffer;
const privateKey = BufferB.from(process.env.GITHUB_PRIVATE_KEY, 'base64').toString('utf8');



// express config
const app = express();
const PORT = 3000;
app.use(express.json());
app.listen(PORT, async () => {
    try {
        await connectDB(process.env.MONGO_URI)

        console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
        console.log(error)
    }

});


// every 30 seconds
// */30 * * * * *

// every 10 minutes
cron.schedule('*/10 * * * *', () => {
    console.log(' ')
    console.log('------------------------------------------------------------------------')
    console.log('------------------------------------------------------------------------')

    console.log('Cron job executed at', new Date().toLocaleTimeString());

    console.log('------------------------------------------------------------------------')
    console.log('------------------------------------------------------------------------')

    scheduledAppMetrics()

});



// endpoints

app.get("/health", async (req, res) => {

    res.status(200).send("external service manager running!")
})


app.get("/deploy", async (req, res) => {
    const { vmType, repoUrl, lastCommitHash, redeployment, metricsAddress, port, geolocation, publicUrl, contractAddress } = req.query;

    console.log('received params')
    console.log({
        vmType, repoUrl, lastCommitHash, redeployment, metricsAddress, port, geolocation, publicUrl, contractAddress
    })

    let tokens = repoUrl.split("/").filter(token => token !== "");
    tokens = tokens.slice(-2);
    const owner = tokens[0]
    const repoName = tokens[1].slice(0, -4);
    const customRepoName = owner + "_" + repoName + "_" + lastCommitHash 
    console.log(customRepoName)

    const availableServerFound = await findAvailableServer(vmType, repoUrl, lastCommitHash, redeployment, metricsAddress, port, geolocation, publicUrl, contractAddress);

    if (availableServerFound) {
        await DeploymentModel.create({
            timestamp: Date.now(),
            appName: customRepoName,
            serverName: availableServerFound.serverName,
            vmType: vmType
        })
        res.status(200).send("available server found. deployment started.")
    } else {
        res.status(404).send("no servers available. deployment abandoned.")
    }
})

app.get("/redeploy", async (req, res) => {

    const { vmType, repoUrl, lastCommitHash, metricsAddress, port, geolocation, publicUrl, contractAddress } = req.query;


    let tokens = repoUrl.split("/").filter(token => token !== "");
    tokens = tokens.slice(-2);
    const owner = tokens[0]
    const repoName = tokens[1].slice(0, -4);
    const customRepoName = owner + "_" + repoName + "_" + lastCommitHash 
    console.log(customRepoName)

    
    const serviceName = customRepoName.replace(/-/g, '_')

    console.log("------------------------------------------------------");
    console.log("serivcename = ", serviceName);
    console.log("------------------------------------------------------");
    

    const agents = await getServiceNodes(customRepoName);
    let deployServiceIp = "";
    if (agents.length > 0) {
        deployServiceIp = agents[0].Address

        const deployParams = {
            vmType: vmType,
            repoUrl: repoUrl,
            lastCommitHash: lastCommitHash,
            redeployment: true,
            port: port,
            publicUrl: publicUrl,
            contractAddress: contractAddress
        }
        console.log("about to make destroy call at ", deployServiceIp)
        const data = await destroyVm(`http://${deployServiceIp}:3001/destroyVm`, deployParams)
        console.log("destroy call")
        console.log(data)
    } else {
        console.log("no agents run that service at the moment")
    }

    const availableServerFound = await findAvailableServer(vmType, repoUrl, lastCommitHash, true, metricsAddress, port, geolocation, publicUrl, contractAddress);

    if (availableServerFound) {
        res.status(200).send("available server found. redeployment started.")
    } else {
        res.status(404).send("no servers available. redeployment abandoned.")
    }
})



app.post('/datadog/trigger', (req, res) => {
    // console.log(req.body.body)

    const parts = req.body.body.split('\n');
    const payload = JSON.parse(parts[1] + parts[2] + parts[3] + parts[4] + parts[5])
    console.log(payload)


    if (payload.loggingSmartContractAddress && payload.message) {
        addLog(payload.loggingSmartContractAddress, payload.message)
    }


    res.send('Function has been triggered!');
});




app.post("/blockchain/dependency-check", async (req, res) => {
    const { contractAddress, depsHashesMap } = req.body;
    console.log(req.body);

    const stepPassed = await pipelineCheck(contractAddress, depsHashesMap);
    console.log("step = ", stepPassed)

    if (stepPassed) {
        console.log("about to respond with 200")
        res.status(200).send("passed");
    } else {
        console.log("about to respond with 401")
        res.status(409).send("failed - hash conflict");
    }
})
