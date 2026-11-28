import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const sourcePath = path.resolve("contracts/CausaCredentialRegistry.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "CausaCredentialRegistry.sol": { content: source } },
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
const artifact = output.contracts["CausaCredentialRegistry.sol"].CausaCredentialRegistry;
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/CausaCredentialRegistry.json", JSON.stringify({
  contractName: "CausaCredentialRegistry",
  compilerVersion: solc.version(),
  abi: artifact.abi,
  bytecode: "0x" + artifact.evm.bytecode.object,
  deployedBytecode: "0x" + artifact.evm.deployedBytecode.object
}, null, 2));
console.log("Compiled CausaCredentialRegistry -> artifacts/CausaCredentialRegistry.json");
