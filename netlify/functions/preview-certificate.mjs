import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createHash } from "node:crypto";

const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
function validate(cert){
  for(const key of ["certificateId","certificateType","businessName","activity","city","issuer","approvedAt","status"]){
    if(!String(cert?.[key]||"").trim())throw new Error("Falta campo requerido: "+key);
  }
  if(!/^LOC-DEMO-[A-Z0-9_-]{6,100}$/i.test(cert.certificateId))throw new Error("Solo se permiten IDs de certificados demo.");
  if(!String(cert.status).toUpperCase().includes("DEMO"))throw new Error("La vista previa solo acepta certificados DEMO.");
  if(!Number.isFinite(Date.parse(cert.approvedAt)))throw new Error("Fecha de aprobación inválida.");
}
export function createPreviewPdf(cert,verificationUrl){
  return new Promise(async(resolve,reject)=>{
    try{
      validate(cert);
      const doc=new PDFDocument({size:"A4",margin:52,info:{Title:cert.certificateType,Author:"LOCALIA preview"}});
      const chunks=[];
      doc.on("data",chunk=>chunks.push(chunk));
      doc.on("end",()=>resolve(Buffer.concat(chunks)));
      doc.on("error",reject);
      doc.fontSize(20).fillColor("#16324f").text("LOCALIA",{align:"center"});
      doc.moveDown(.3).fontSize(10).fillColor("#b45309").text("VISTA PREVIA · SIN REGISTRO BLOCKCHAIN",{align:"center"});
      doc.moveDown(1.4).fontSize(17).fillColor("#172b45").text(cert.certificateType,{align:"center"});
      doc.moveDown(1).fontSize(11).fillColor("#26384d");
      for(const [label,value] of [["Establecimiento",cert.businessName],["Actividad",cert.activity],["Ciudad",cert.city],["Entidad revisora",cert.issuer],["Código",cert.certificateId],["Fecha de aprobación",new Date(cert.approvedAt).toLocaleString("es-EC")]]){
        doc.font("Helvetica-Bold").text(label+": ",{continued:true});doc.font("Helvetica").text(String(value||"—"));doc.moveDown(.5);
      }
      doc.moveDown().fontSize(10).fillColor("#9a3412").text("Documento de prueba. No es oficial, no ha sido almacenado en Supabase y no está registrado ni verificado en ME Network.",{align:"center"});
      const dataUrl=await QRCode.toDataURL(verificationUrl,{width:220,margin:1,errorCorrectionLevel:"M"});
      doc.moveDown(1).image(Buffer.from(dataUrl.split(",")[1],"base64"),{fit:[140,140],align:"center"});
      doc.moveDown(.5).fontSize(9).fillColor("#475569").text("QR de prueba: la verificación permanecerá pendiente hasta conectar y confirmar la blockchain.",{align:"center"});
      doc.text(verificationUrl,{align:"center"});
      doc.end();
    }catch(error){reject(error);}
  });
}
export async function handler(event){
  if(event.httpMethod==="OPTIONS")return{statusCode:204,headers:{"access-control-allow-methods":"POST,OPTIONS","access-control-allow-headers":"Content-Type"}};
  if(event.httpMethod!=="POST")return json(405,{error:"Método no permitido"});
  try{
    const cert=JSON.parse(event.body||"{}");validate(cert);
    const site=process.env.HARBOR_SITE_URL;
    const host=event.headers?.host||event.headers?.Host;
    const origin=site|| (host&&/^[a-z0-9.-]+(?::\d+)?$/i.test(host)?"https://"+host:"https://preview.invalid");
    const verificationUrl=new URL("/verify/"+encodeURIComponent(cert.certificateId),origin).toString();
    const pdf=await createPreviewPdf(cert,verificationUrl);
    const sha256=createHash("sha256").update(pdf).digest("hex");
    return json(200,{ok:true,mode:"preview_only",registered:false,certificateId:cert.certificateId,sha256,verificationUrl,pdfBase64:pdf.toString("base64"),message:"PDF de prueba generado. No se guardó ni se registró en blockchain."});
  }catch(error){return json(400,{error:error?.message||"No se pudo generar la vista previa"});}
}
