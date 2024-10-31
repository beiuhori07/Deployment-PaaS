import mongoose from 'mongoose'

const MetricsSchema = new mongoose.Schema({
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
    requestCount: {
        type: Number,
        required: [true, 'Please provide requestCount']
    },
    requestTotalTime: {
        type: Number,
        required: [true, 'Please provide requestTotalTime']
    },
    requestMaxTime: {
        type: Number,
        required: [true, 'Please provide requestTotalTime']
    },
    serverRAMUsed: {
        type: Number,
        required: [true, 'Please provide serverRAMUsed']
    },
    serverRAMFree: {
        type: Number,
        required: [true, 'Please provide serverRAMFree']
    },
    serverRAMTotal: {
        type: Number,
        required: [true, 'Please provide serverRAMTotal']
    },
    appVmRAMUsed: {
        type: Number,
        required: [false, 'Please provide appVmRAMUsed']
    },
    appVmRAMFree: {
        type: Number,
        required: [false, 'Please provide appVmRAMFree']
    },
    appVmRAMTotal: {
        type: Number,
        required: [false, 'Please provide appVmRAMTotal']
    },
    memoryUnit: {
        type: String,
        required: [true, 'Please provide memoryUnit']
    },
    processUpTime: {
        type: Number,
        required: [true, 'Please provide processUpTime']
    },
    bootTime: {
        type: Number,
        required: [true, 'Please provide bootTime']
    },
    cpuUsage: {
        type: Number,
        required: [true, 'Please provide cpuUsage']
    },
    freeDisk: {
        type: Number,
        required: [true, 'Please provide freeDisk']
    },
    threadsPeak: {
        type: Number,
        required: [true, 'Please provide threadsPeak']
    }
})


export default mongoose.model('Metrics', MetricsSchema)