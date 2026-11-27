import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const sourcePath = path.resolve("contracts/LocaliaCredentialRegistry.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "LocaliaCredentialRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } }
  }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter((item) => item.severity === "error");
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}
const artifact = output.contracts["LocaliaCredentialRegistry.sol"].LocaliaCredentialRegistry;
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/LocaliaCredentialRegistry.json", JSON.stringify({
  contractName: "LocaliaCredentialRegistry",
  compilerVersion: solc.version(),
  abi: artifact.abi,
  bytecode: "0x" + artifact.evm.bytecode.object,
  deployedBytecode: "0x" + artifact.evm.deployedBytecode.object
}, null, 2));
console.log("Compiled LocaliaCredentialRegistry -> artifacts/LocaliaCredentialRegistry.json");
