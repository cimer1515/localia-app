import { createClient } from "@supabase/supabase-js";
import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import { createHash } from "node:crypto";

const ABI=["function verifyCredential(bytes32 credentialId,bytes32 documentHash) view returns (bool valid,address issuer,uint64 issuedAt,bool revoked)"];
const html=(title,body,status=200)=>({statusCode:status,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"},body:`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · HARBOR</title><style>body{font:16px system-ui;background:#f3f6fa;color:#172b45;margin:0;padding:24px}.card{max-width:720px;margin:5vh auto;background:white;padding:28px;border-radius:18px;box-shadow:0 8px 30px #1b365012}h1{font-size:24px}.ok{color:#087443}.bad{color:#b42318}code{word-break:break-all;background:#f1f5f9;padding:8px;border-radius:6px;display:block}a{display:inline-block;margin-top:18px;color:#155eef;font-weight:600}</style><main class="card"><h1>HARBOR · Verificación de certificado</h1>${body}</main></html>`});
export async function handler(event){
  try{
    const id=decodeURIComponent((event.path||"").split("/").pop()||event.queryStringParameters?.id||"");
    if(!id) return html("No encontrado",'<p class="bad">No se indicó un certificado.</p>',400);
    const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const {data:row,error}=await supabase.from("certificates").select("*").eq("certificate_id",id).maybeSingle();
    if(error||!row) return html("No encontrado",'<p class="bad">No se encontró el certificado o no está publicado.</p>',404);
    const provider=new JsonRpcProvider(process.env.ME_EVM_RPC_URL);
    const network=await provider.getNetwork();
    if(network.chainId!==BigInt(process.env.ME_EVM_CHAIN_ID)) throw new Error("El RPC de verificación no coincide con el chain ID configurado.");
    const contract=new Contract(process.env.ME_REGISTRY_ADDRESS,ABI,provider);
    const credentialId=row.credential_id||keccak256(toUtf8Bytes(id));
    const [valid,issuer,issuedAt,revoked]=await contract.verifyCredential(credentialId,"0x"+row.sha256);
    const bucket=row.storage_bucket||"certificates";
    const {data:file,error:fileError}=await supabase.storage.from(bucket).download(row.storage_path);
    if(fileError||!file) throw new Error("No se pudo recuperar el PDF almacenado.");
    const bytes=Buffer.from(await file.arrayBuffer());
    const actual=createHash("sha256").update(bytes).digest("hex");
    const fileMatches=actual.toLowerCase()===row.sha256.toLowerCase();
    const verified=Boolean(valid)&&!revoked&&fileMatches&&row.status==="confirmed";
    if(!verified) return html("No verificado",`<p class="bad">No se pudo confirmar la autenticidad de este documento.</p><p>Puede estar revocado, no coincidir con la huella registrada o no tener una transacción válida.</p><p>ID: ${id}</p><code>${row.sha256}</code>`,200);
    const {data:signed,error:signedError}=await supabase.storage.from(bucket).createSignedUrl(row.storage_path,300,{download:id+".pdf"});
    if(signedError||!signed?.signedUrl) throw new Error("No se pudo generar un enlace temporal al PDF.");
    const safe=(v)=>String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    return html("Verificado",`<p class="ok"><strong>✓ Certificado verificado en ME Network</strong></p><p>El PDF recuperado coincide con el SHA-256 registrado en blockchain.</p><p><strong>Certificado:</strong> ${safe(id)}</p><p><strong>Establecimiento:</strong> ${safe(row.business_name)}</p><p><strong>Tipo:</strong> ${safe(row.certificate_type)}</p><p><strong>Emisor:</strong> ${safe(row.issuer_name)}</p><p><strong>Emisor blockchain:</strong> ${safe(issuer)}</p><p><strong>Fecha de registro:</strong> ${new Date(Number(issuedAt)*1000).toLocaleString("es-EC")}</p><p><strong>SHA-256:</strong></p><code>${safe(row.sha256)}</code><p><strong>TxHash:</strong></p><code>${safe(row.tx_hash)}</code><a href="${safe(signed.signedUrl)}" rel="noopener">Abrir / descargar certificado PDF (enlace temporal)</a>`,200);
  }catch(error){
    return html("Error de verificación",'<p class="bad">'+String(error?.message||"Error").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+'</p>',500);
  }
}
