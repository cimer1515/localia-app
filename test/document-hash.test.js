import test from "node:test";
import assert from "node:assert/strict";
import { hashDocument } from "../src/document-hash.js";

test("hashDocument computes SHA-256 over the exact file bytes", async () => {
  const bytes = new TextEncoder().encode("abc");
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  assert.equal(await hashDocument(file), "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
