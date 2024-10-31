import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const alchemy_api_key = "key"
const alchemyApiURL =
    `https://eth-sepolia.g.alchemy.com/v2/${alchemy_api_key}`;
const provider = new ethers.JsonRpcProvider(alchemyApiURL);
const privateKey = process.env.PRIVATE_KEY
const contractAbi = [
    "function addLog(string memory log) public"
];
const wallet = new ethers.Wallet(privateKey, provider);

export default async function addLog(logSmartContracAddress, log) {


    console.log("addr ", logSmartContracAddress )
    console.log("abi ", contractAbi)
    console.log("wallet ", wallet);


    try {
        const logsStorageContract = new ethers.Contract(logSmartContracAddress, contractAbi, wallet);

        const tx = await logsStorageContract.addLog(log);
        console.log('------')
        console.log('submitted log:', log)
        console.log('Transaction submitted:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmed:');
        console.log('------')
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}


// module.exports = addLog

