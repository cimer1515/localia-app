import { createClient } from "@supabase/supabase-js";
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createHash } from "node:crypto";

const ABI = [
  "function getCredential(bytes32 credentialId) view returns (bytes32 documentHash,address issuer,uint64 issuedAt,bool revoked)",
  "function registerCredential(bytes32 credentialId,bytes32 documentHash)",
  "event CredentialRegistered(bytes32 indexed credentialId,bytes32 indexed documentHash,address indexed issuer,uint64 issuedAt)"
];

const required = ["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","ME_EVM_RPC_URL","ME_EVM_CHAIN_ID","ME_REGISTRY_ADDRESS","ME_ISSUER_PRIVATE_KEY","HARBOR_SITE_URL"];
function envCheck() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error("Falta configurar variables del servidor: " + missing.join(", "));
}
function json(statusCode, body) {
  return { statusCode, headers: { "content-type":"application/json", "cache-control":"no-store", "access-control-allow-origin": process.env.HARBOR_SITE_URL || "*" }, body: JSON.stringify(body) };
}
function pdfBuffer(cert, verificationUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size:"A4", margin:52, info:{Title:cert.certificateType,Author:"HARBOR"} });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.fontSize(20).fillColor("#16324f").text("HARBOR", {align:"center"});
      doc.moveDown(0.3).fontSize(10).fillColor("#64748b").text("CERTIFICADO DE DEMOSTRACIÓN · NO OFICIAL", {align:"center"});
      doc.moveDown(1.5).fontSize(17).fillColor("#172b45").text(cert.certificateType, {align:"center"});
      doc.moveDown(1.2).fontSize(11).fillColor("#26384d");
      const rows = [
        ["Establecimiento", cert.businessName],["Actividad",cert.activity],["Ciudad",cert.city],
        ["Entidad revisora",cert.issuer],["Código de certificado",cert.certificateId],
        ["Fecha de aprobación",new Date(cert.approvedAt).toLocaleString("es-EC")]
      ];
      for (const [label,value] of rows) {
        doc.font("Helvetica-Bold").text(label + ": ", {continued:true});
        doc.font("Helvetica").text(String(value || "—"));
        doc.moveDown(0.55);
      }
      doc.moveDown().fontSize(10).fillColor("#9a3412").text("Este documento es una constancia de demostración. No es un permiso oficial ni sustituye la aprobación de una autoridad competente.", {align:"center"});
      const qrData = await QRCode.toDataURL(verificationUrl,{width:220,margin:1,errorCorrectionLevel:"M"});
      const qrBuffer = Buffer.from(qrData.split(",")[1],"base64");
      doc.moveDown(1.1).image(qrBuffer, {fit:[145,145],align:"center"});
      doc.moveDown(0.5).fontSize(9).fillColor("#475569").text("Escanea el QR para verificar el registro blockchain y consultar el documento.", {align:"center"});
      doc.moveDown(0.3).text(verificationUrl, {align:"center",link:verificationUrl});
      doc.end();
    } catch (error) { reject(error); }
  });
}
async function getIssuer(req, supabase) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Se requiere sesión de una entidad emisora autorizada.");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) throw new Error("La sesión de la entidad no es válida.");
  const { data: role, error: roleError } = await supabase.from("issuer_roles")
    .select("user_id,active,issuer_name").eq("user_id",userData.user.id).eq("active",true).maybeSingle();
  if (roleError || !role) throw new Error("La cuenta no tiene permiso de emitir certificados.");
  if (!String(role.issuer_name||"").trim()) throw new Error("La cuenta emisora no tiene un nombre de entidad configurado.");
  return { ...userData.user, issuerName: role.issuer_name };
}
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return {statusCode:204,headers:{"access-control-allow-origin":process.env.HARBOR_SITE_URL||"*","access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"Content-Type,Authorization"}};
  if (event.httpMethod !== "POST") return json(405,{error:"Método no permitido"});
  try {
    envCheck();
    const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const user=await getIssuer(event,supabase);
    const cert=JSON.parse(event.body||"{}");
    for (const key of ["certificateId","certificateType","businessName","activity","city","issuer","approvedAt"]) {
      if (!String(cert[key]||"").trim()) return json(400,{error:"Falta campo requerido: "+key});
    }
    if (!String(cert.certificateId).match(/^[A-Z0-9_-]{6,100}$/i)) return json(400,{error:"ID de certificado inválido"});
    if (!Number.isFinite(Date.parse(cert.approvedAt))) return json(400,{error:"Fecha de aprobación inválida"});
    if (!String(cert.status||"").toUpperCase().includes("DEMO")) return json(400,{error:"Esta función solo emite certificados de demostración en esta versión."});
    cert.issuer= user.issuerName;
    const verificationUrl=new URL("/verify/"+encodeURIComponent(cert.certificateId),process.env.HARBOR_SITE_URL).toString();
    const pdf=await pdfBuffer(cert,verificationUrl);
    const hash=createHash("sha256").update(pdf).digest("hex");
    const hashBytes32="0x"+hash;
    const credentialId=keccak256(toUtf8Bytes(cert.certificateId));
    const storagePath=cert.certificateId+".pdf";
    const bucket=process.env.SUPABASE_CERT_BUCKET||"certificates";
    const {error:uploadError}=await supabase.storage.from(bucket).upload(storagePath,pdf,{contentType:"application/pdf",upsert:true});
    if (uploadError) throw new Error("No se pudo guardar el PDF en Supabase Storage: "+uploadError.message);

    const provider=new JsonRpcProvider(process.env.ME_EVM_RPC_URL);
    const network=await provider.getNetwork();
    const expected=BigInt(process.env.ME_EVM_CHAIN_ID);
    if(network.chainId!==expected) throw new Error("El RPC ME Network responde con un chain ID diferente al configurado.");
    const wallet=new Wallet(process.env.ME_ISSUER_PRIVATE_KEY,provider);
    const contract=new Contract(process.env.ME_REGISTRY_ADDRESS,ABI,wallet);
    let record=await contract.getCredential(credentialId);
    let txHash="";
    if (BigInt(record.issuedAt)===0n) {
      const tx=await contract.registerCredential(credentialId,hashBytes32);
      const receipt=await tx.wait();
      if(!receipt || receipt.status!==1) throw new Error("La transacción de registro no fue confirmada.");
      txHash=receipt.hash;
      record=await contract.getCredential(credentialId);
    } else {
      if(String(record.documentHash).toLowerCase()!==hashBytes32.toLowerCase()) throw new Error("Este ID ya está registrado con otra huella. No se sobrescribirá.");
      const filter=contract.filters.CredentialRegistered(credentialId,hashBytes32);
      const logs=await contract.queryFilter(filter,0,"latest");
      txHash=logs.at(-1)?.transactionHash||"";
      if(!txHash) throw new Error("El registro ya existe en blockchain, pero no se pudo recuperar su TxHash. Contacta al administrador.");
    }
    if(String(record.documentHash).toLowerCase()!==hashBytes32.toLowerCase() || record.revoked) throw new Error("La verificación posterior al registro falló.");
    const {error:dbError}=await supabase.from("certificates").upsert({
      certificate_id:cert.certificateId,credential_id:credentialId,owner_id:user.id,
      certificate_type:cert.certificateType,issuer_name:user.issuerName,approved_at:cert.approvedAt,
      business_name:cert.businessName,activity:cert.activity,city:cert.city,
      storage_bucket:bucket,storage_path:storagePath,sha256:hash,tx_hash:txHash,
      chain_id:Number(network.chainId),registry_address:process.env.ME_REGISTRY_ADDRESS,
      issuer_wallet:wallet.address,status:"confirmed",verification_url:verificationUrl
    },{onConflict:"certificate_id"});
    if(dbError) throw new Error("PDF y blockchain registrados, pero falló guardar los metadatos: "+dbError.message);
    return json(200,{ok:true,certificateId:cert.certificateId,sha256:hash,txHash,chainId:Number(network.chainId),verificationUrl,status:"confirmed"});
  } catch(error) {
    const message=error?.message||"Error interno al emitir el certificado";
    const status=/sesión|permiso|autorizada/i.test(message)?401:500;
    return json(status,{error:message});
  }
}
