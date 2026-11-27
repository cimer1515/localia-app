import QRCode from "qrcode";
import "./demo.css";

const root=document.querySelector("#localia-demo");
const demoTypes=[
  {key:"documental",title:"Constancia demo de revisión documental",scope:"Documentos adjuntos y checklist revisados"},
  {key:"plano",title:"Constancia demo de plano y señalética",scope:"Distribución, señalización y circulación del local"},
  {key:"preparacion",title:"Constancia demo de preparación del establecimiento",scope:"Resumen de preparación del establecimiento"}
];
const sample={businessName:"Cafetería Demo LOCALIA",activity:"Café y pastelería (ejemplo)",city:"Riobamba",issuer:"Entidad demostrativa LOCALIA (no oficial)"};
const stages=["Borrador","En revisión","Correcciones","Reenviado","Aprobado","Certificados emitidos"];
let stage=Number(sessionStorage.getItem("localia-demo-stage")||0);
let certificates=[];

root.innerHTML=`
<div class="demo-wrap">
  <nav class="demo-nav"><div class="demo-brand">LOCALIA<small>BUSINESS SETUP · DEMO</small></div><a class="demo-link" href="./index.html">← Volver a la app</a></nav>
  <header class="demo-hero"><span class="demo-tag">ENTIDAD DE PRUEBA · MODO DEMOSTRACIÓN</span><h1>Prueba el flujo y visualiza tus certificados.</h1><p>Esta página es una zona de prueba independiente para el concurso. Puedes recorrer la revisión demo y ver tres certificados de ejemplo, cada uno con su QR y huella SHA-256.</p></header>
  <div class="demo-alert"><b>Importante:</b> los certificados que ves son muestras ficticias. No son permisos oficiales y no están registrados en ME Network. No conectes una wallet aquí; blockchain se incorporará después.</div>
  <section class="demo-panel" id="workflow-demo"><h2>Simulador de la entidad demo</h2><p>Avanza paso a paso para comprobar el flujo de envío, correcciones, aprobación y emisión. Los datos son de ejemplo y no se envían a ningún servidor.</p><div id="demo-state" class="demo-state"></div><div class="demo-actions" id="demo-actions"></div><div class="demo-feedback" id="demo-feedback" aria-live="polite"></div></section>
  <section class="demo-panel"><div id="certificates-heading"><h2>Certificados demo de ejemplo</h2><p>Los tres certificados están disponibles desde el inicio para que puedas abrirlos e imprimirlos individualmente.</p></div><div id="certificates" class="cert-grid"><div class="demo-loading">Generando certificados de muestra…</div></div></section>
  <footer class="demo-footer">LOCALIA · Prototipo de hackathon · Datos ficticios · Sin registro blockchain</footer>
</div>`;

function renderStage(){
 const active=stages.map((name,i)=>`<span class="state-pill ${i<=stage?"active":""}">${String(i+1).padStart(2,"0")} · ${name}</span>`).join("");
 document.querySelector("#demo-state").innerHTML=active;
 const actions=[
  {label:"Crear expediente de ejemplo",from:[0],to:0,msg:"Expediente demo creado con datos ficticios."},
  {label:"Enviar a entidad demo",from:[0],to:1,msg:"Expediente enviado a revisión simulada."},
  {label:"Solicitar correcciones",from:[1],to:2,msg:"La entidad demo emitió observaciones de ejemplo: revisar documentación y plano."},
  {label:"Corregir y reenviar",from:[2],to:3,msg:"Correcciones demo guardadas y expediente reenviado."},
  {label:"Aprobar expediente demo",from:[1,3],to:4,msg:"La entidad de prueba aprobó el expediente simulado."},
  {label:"Emitir 3 certificados demo",from:[4,5],to:5,msg:"Se muestran las tres constancias de demostración."},
  {label:"Reiniciar simulación",from:[0,1,2,3,4,5],to:0,msg:"Simulación reiniciada. Los certificados de ejemplo siguen disponibles."}
 ];
 const chosen=stage===0?[actions[0],actions[1],actions[6]]:stage===1?[actions[2],actions[4],actions[6]]:stage===2?[actions[3],actions[6]]:stage===3?[actions[2],actions[4],actions[6]]:stage===4?[actions[5],actions[6]]:[actions[6]];
 document.querySelector("#demo-actions").innerHTML=chosen.map((a,i)=>`<button type="button" class="demo-btn ${i===0?"primary":""}" data-stage="${a.to}" data-message="${a.msg}">${a.label}</button>`).join("");
 document.querySelectorAll("[data-stage]").forEach(btn=>btn.addEventListener("click",()=>{
   stage=Number(btn.dataset.stage);sessionStorage.setItem("localia-demo-stage",String(stage));renderStage();document.querySelector("#demo-feedback").textContent=btn.dataset.message;
 }));
}
async function createCertificates(){
 const target=document.querySelector("#certificates");
 certificates=[];
 for(const type of demoTypes){
  const id="LOC-DEMO-"+type.key.toUpperCase()+"-000"+(demoTypes.indexOf(type)+1);
  const record={id,...type,...sample,approvedAt:new Date().toISOString(),status:"DEMO · NO OFICIAL"};
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(record)));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
  const qr=await QRCode.toDataURL("LOCALIA-DEMO|ID:"+id+"|SHA256:"+hash+"|NOT-ON-CHAIN",{width:180,margin:1,errorCorrectionLevel:"M"});
  certificates.push({...record,hash,qr});
 }
 target.innerHTML=certificates.map((c,i)=>`
 <article class="certificate-card" data-cert-id="${c.id}">
  <div class="cert-head"><div class="cert-brand">LOCALIA<small>CONSTANCIA DE DEMOSTRACIÓN</small></div><div class="cert-stamp">DEMO<br>NO OFICIAL</div></div>
  <h3 class="cert-title">${c.title}</h3><p class="cert-notice">Documento de muestra para comprobar el flujo del prototipo. No es permiso de funcionamiento ni certificado de autoridad pública.</p>
  <div class="cert-fields"><div><small>Establecimiento</small><b>${c.businessName}</b></div><div><small>Actividad</small><b>${c.activity}</b></div><div><small>Ciudad</small><b>${c.city}</b></div><div><small>Entidad revisora</small><b>${c.issuer}</b></div><div><small>ID demo</small><b>${c.id}</b></div><div><small>Alcance</small><b>${c.scope}</b></div><div><small>Estado</small><b>${c.status}</b></div></div>
  <div class="cert-proof"><img src="${c.qr}" alt="QR de certificado demo"><div><small>Huella SHA-256 de ejemplo</small><br><code>${c.hash}</code><span class="chain-label">Sin transacción · No registrado en blockchain</span></div></div>
  <div class="cert-actions"><button class="demo-btn primary" type="button" data-print="${c.id}">Imprimir / guardar este certificado PDF</button><button class="demo-btn" type="button" data-open="${c.id}">Ver certificado</button></div>
 </article>`).join("");
 document.querySelectorAll("[data-print]").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".certificate-card").forEach(card=>card.removeAttribute("data-print-selected"));
  document.querySelector('[data-cert-id="'+btn.dataset.print+'"]').setAttribute("data-print-selected","true");
  window.print();
 }));
 document.querySelectorAll("[data-open]").forEach(btn=>btn.addEventListener("click",()=>{
  const card=document.querySelector('[data-cert-id="'+btn.dataset.open+'"]');
  card.scrollIntoView({behavior:"smooth",block:"center"});
  card.style.outline="3px solid #7ba7df";setTimeout(()=>card.style.outline="",1300);
 }));
}
renderStage();
createCertificates().catch(error=>{document.querySelector("#certificates").innerHTML='<p>No se pudieron generar los QR. Recarga la página e intenta de nuevo.</p>';console.error(error);});
window.addEventListener("afterprint",()=>document.querySelectorAll(".certificate-card").forEach(card=>card.removeAttribute("data-print-selected")));
