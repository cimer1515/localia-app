import { sha256 } from "ethers";

/** SHA-256 of the exact certificate file bytes. Never upload the document itself to the blockchain. */
export async function hashDocument(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return sha256(bytes);
}
