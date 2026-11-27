import "dotenv/config";
import fs from "node:fs";
import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";

const rpcUrl = process.env.ME_EVM_RPC_URL;
const privateKey = process.env.ME_DEPLOYER_PRIVATE_KEY;
const expectedChainId = Number(process.env.ME_EVM_CHAIN_ID || 400);
if (!rpcUrl || !privateKey) {
  throw new Error("Set ME_EVM_RPC_URL and ME_DEPLOYER_PRIVATE_KEY in your local .env file.");
}
if (!fs.existsSync("artifacts/LocaliaCredentialRegistry.json")) {
  throw new Error("Run npm run compile:contract first.");
}
const artifact = JSON.parse(fs.readFileSync("artifacts/LocaliaCredentialRegistry.json", "utf8"));
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
if (Number(network.chainId) !== expectedChainId) {
  throw new Error(`RPC chainId ${network.chainId} does not match configured ME_EVM_CHAIN_ID ${expectedChainId}.`);
}
const wallet = new Wallet(privateKey, provider);
console.log("Deploying from:", wallet.address, "chainId:", network.chainId.toString());
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();
console.log("LocaliaCredentialRegistry:", await contract.getAddress());
console.log("Deployment transaction:", contract.deploymentTransaction()?.hash);
console.log("Add this address to VITE_LOCALIA_REGISTRY_ADDRESS in your local .env.");
