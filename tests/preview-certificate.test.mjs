import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { handler, createPreviewPdf } from "../netlify/functions/preview-certificate.mjs";

const cert={
  certificateId:"LOC-DEMO-TEST-ABC123",
  certificateType:"Constancia demo de prueba",
  businessName:"Negocio de prueba",
  activity:"Actividad demo",
  city:"Quito",
  issuer:"Entidad demo",
  approvedAt:"2026-11-28T12:00:00.000Z",
  status:"DEMO - NOT OFFICIAL"
};
const pdf=await createPreviewPdf(cert,"https://preview.invalid/verify/LOC-DEMO-TEST-ABC123");
assert.equal(pdf.subarray(0,4).toString()," %PDF".trim(),"PDF output should begin with PDF signature");
const event={httpMethod:"POST",headers:{host:"localia.test"},body:JSON.stringify(cert)};
const response=await handler(event);
assert.equal(response.statusCode,200);
const result=JSON.parse(response.body);
assert.equal(result.mode,"preview_only");
assert.equal(result.registered,false);
assert.equal(result.sha256,createHash("sha256").update(Buffer.from(result.pdfBase64,"base64")).digest("hex"));
assert.match(result.verificationUrl,/\/verify\/LOC-DEMO-TEST-ABC123$/);
const invalid=await handler({...event,body:JSON.stringify({...cert,status:"OFFICIAL"})});
assert.equal(invalid.statusCode,400);
console.log("Certificate preview tests passed: PDF, QR URL, SHA-256, and demo-only guard.");
