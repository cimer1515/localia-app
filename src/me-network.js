import { BrowserProvider, Contract, keccak256 } from "ethers";

const registryAbi = [
  "function owner() view returns (address)",
  "function authorizedIssuers(address) view returns (bool)",
  "function setIssuer(address issuer, bool authorized)",
  "function registerCredential(bytes32 credentialId, bytes32 documentHash)",
  "function verifyCredential(bytes32 credentialId, bytes32 documentHash) view returns (bool valid, address issuer, uint64 issuedAt, bool revoked)",
  "function revokeCredential(bytes32 credentialId)"
];

const chainIdSetting = import.meta.env.VITE_ME_EVM_CHAIN_ID;\nconst expectedChainId = chainIdSetting ? Number(chainIdSetting) : null;
const registryAddress = import.meta.env.VITE_LOCALIA_REGISTRY_ADDRESS || "";

let browserProvider;
let connectedAddress = "";

export async function connectMEWallet() {
  if (!window.ethereum) throw new Error("No se detectó una wallet EVM. Instala o abre MetaMask/ME Pass compatible.");
  if (!Number.isInteger(expectedChainId) || expectedChainId <= 0) throw new Error("Configura el chain ID oficial vigente de ME Network antes de conectar.");\n  browserProvider = new BrowserProvider(window.ethereum);
  const accounts = await browserProvider.send("eth_requestAccounts", []);
  if (!accounts?.length) throw new Error("No se autorizó ninguna cuenta.");
  const network = await browserProvider.getNetwork();
  if (Number(network.chainId) !== expectedChainId) {
    throw new Error(`La wallet está en chain ID ${network.chainId}. LOCALIA espera ${expectedChainId}. Selecciona la red ME Network correcta.`);
  }
  connectedAddress = accounts[0];
  return { address: connectedAddress, chainId: Number(network.chainId) };
}

export function getConnectedAddress() {
  return connectedAddress;
}

async function getRegistry(write = false) {
  if (!browserProvider || !connectedAddress) throw new Error("Conecta primero tu wallet a ME Network.");
  if (!registryAddress) throw new Error("Falta configurar VITE_LOCALIA_REGISTRY_ADDRESS después de desplegar el contrato.");
  const signerOrProvider = write ? await browserProvider.getSigner() : browserProvider;
  return new Contract(registryAddress, registryAbi, signerOrProvider);
}

/// Hash the exact document bytes locally. The file itself is never uploaded to ME Network.
export async function hashDocument(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return keccak256(bytes);
}

export function createCredentialId() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return keccak256(randomBytes);
}

export async function registerDocumentHash(credentialId, documentHash) {
  const registry = await getRegistry(true);
  const tx = await registry.registerCredential(credentialId, documentHash);
  return await tx.wait();
}

export async function verifyDocumentHash(credentialId, documentHash) {
  const registry = await getRegistry(false);
  return await registry.verifyCredential(credentialId, documentHash);
}

export async function authorizeIssuer(issuerAddress) {
  const registry = await getRegistry(true);
  const tx = await registry.setIssuer(issuerAddress, true);
  return await tx.wait();
}

export async function revokeCredential(credentialId) {
  const registry = await getRegistry(true);
  const tx = await registry.revokeCredential(credentialId);
  return await tx.wait();
}
