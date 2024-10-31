import mongoose from 'mongoose'

const DeploymentSchema = new mongoose.Schema({
    timestamp: {
        type: String,
        required: [true, 'Please provide timestamp']
    },
    appName: {
        type: String,
        required: [true, 'Please provide appName']
    },
    serverName: {
        type: String,
        required: [true, 'Please provide serverName']
    },
    vmType: {
        type: String,
        required: [true, 'Please provide vmType']
    }
})


export default mongoose.model('Deployments', DeploymentSchema)