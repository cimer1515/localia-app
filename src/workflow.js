import QRCode from "qrcode";
import { supabaseClient } from "./supabase-client.js";
import "./workflow.css";

const STORAGE_KEY = "localia.case.v1";
const DEMO_REVIEW_PIN = "LOCALIA-DEMO-2026";
const DEMO_ISSUER = "Entidad demostrativa LOCALIA (no oficial)";
const AREA_TYPES = {
 kitchen:{label:"Cocina",icon:"♨",color:"#fce6d5",sign:"COCINA"},
 restroom:{label:"Baño",icon:"🚻",color:"#e8e2f8",sign:"BAÑO"},
 storage:{label:"Bodega",icon:"▤",color:"#e6edf5",sign:"BODEGA"},
 counter:{label:"Caja / atención",icon:"▣",color:"#dce8fa",sign:"ATENCIÓN"},
 public:{label:"Área pública",icon:"♙",color:"#e2f1e8",sign:"ÁREA PÚBLICA"},
 entrance:{label:"Entrada",icon:"↘",color:"#d8f1e7",sign:"ENTRADA"},
 exit:{label:"Salida",icon:"⇧",color:"#c9f0df",sign:"SALIDA"},
 fire:{label:"Extintor",icon:"🧯",color:"#f9dddd",sign:"EXTINTOR"},
 firstaid:{label:"Primeros auxilios",icon:"✚",color:"#f5e5e5",sign:"PRIMEROS AUXILIOS"},
 accessible:{label:"Accesibilidad",icon:"♿",color:"#e1eff9",sign:"ACCESIBLE"}
};
const DEMO_CERTIFICATE_TYPES = [
 {key:"documentary",title:"Constancia demo de revisión documental",scope:"Documentos adjuntos y checklist"},
 {key:"layout",title:"Constancia demo de plano y señalética",scope:"Distribución, señales y circulación"},
 {key:"readiness",title:"Constancia demo de preparación del establecimiento",scope:"Resumen del expediente revisado"}
];

let caseData = null;
let cryptoKey = null;
let saltBytes = null;
let quickStartData = null;
let issuanceInProgress = false;

const $ = (sel) => document.querySelector(sel);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const randomHex = (length = 16) => Array.from(crypto.getRandomValues(new Uint8Array(length)), b => b.toString(16).padStart(2, "0")).join("");
const toBase64 = (bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (value) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function saveEncryptedCase() {
  if (!cryptoKey || !caseData) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(JSON.stringify(caseData)));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, salt: toBase64(saltBytes), iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) }));
}
async function createVault(passphrase) {
  saltBytes = crypto.getRandomValues(new Uint8Array(16));
  cryptoKey = await deriveKey(passphrase, saltBytes);
  caseData = { id: randomHex(12), status: "draft", form: {}, requirements: [], corrections: [], submittedAt: null, approvedAt: null, certificate: null, documents: [] };
  await saveEncryptedCase();
}
async function unlockVault(passphrase) {
  const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (!record) throw new Error("No existe un expediente cifrado en este navegador.");
  saltBytes = fromBase64(record.salt);
  cryptoKey = await deriveKey(passphrase, saltBytes);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(record.iv) }, cryptoKey, fromBase64(record.data));
  caseData = JSON.parse(new TextDecoder().decode(decrypted));
}
function requiredMissing(form) {
  const fields = [
    ["businessName", "Nombre del negocio"],
    ["activity", "Actividad específica"],
    ["city", "Ciudad / cantón"],
    ["address", "Dirección del local"],
    ["ownerName", "Responsable del trámite"],
    ["area", "Área aproximada del local"]
  ];
  return fields.filter(([key]) => !String(form[key] || "").trim()).map(([, label]) => label);
}
function requirementList(form) {
  const base = [
    "Confirmar uso de suelo y compatibilidad de actividad con el municipio",
    "Consultar patente / autorización municipal aplicable",
    "Revisar requisitos de prevención de incendios y evacuación con el organismo competente",
    "Preparar plano o croquis del establecimiento con medidas y accesos",
    "Revisar condiciones de accesibilidad y señalética",
    "Confirmar requisitos sanitarios si la actividad incluye alimentos, salud o productos regulados"
  ];
  if (form.businessType === "cafe") base.push("Consultar autorización y condiciones sanitarias para preparación / expendio de alimentos");
  return base;
}
function getStageLabel(status) {
  return ({ draft: "Borrador", submitted: "En revisión", corrections: "Correcciones solicitadas", approved: "Aprobado por entidad demo", issued: "Certificado demo emitido" })[status] || "Borrador";
}
async function applyQuickStart() {
  if(!quickStartData||!caseData||!cryptoKey)return;
  const data=quickStartData;quickStartData=null;
  caseData.form={...(caseData.form||{}),...data};
  caseData.requirements=requirementList(caseData.form);
  caseData.plan={width:Number(data.width)||8,depth:Number(data.depth)||6,cells:caseData.plan?.cells||{}};
  await saveEncryptedCase();renderAll();
}
function renderShell() {
  const section = document.createElement("section");
  section.id = "localia-workflow";
  section.className = "workflow-section";
  section.innerHTML = `
    <div class="workflow-heading">
      <div><div class="eyebrow">EXPEDIENTE DIGITAL · PROTOTIPO</div><h2>De la preparación a la <em>aprobación.</em></h2></div>
      <p>Completa tu expediente, revisa el plano y responde a las observaciones. Solo la entidad revisora puede aprobar.</p>
    </div>
    <div class="privacy-banner"><span class="privacy-icon">🔐</span><div><b>Expediente privado y cifrado en este prototipo</b><p>Los datos del formulario se cifran en tu navegador con una contraseña que solo tú conoces. No se guardan en la blockchain. Para una revisión real se necesitará un servidor seguro con acceso autorizado de la entidad.</p></div></div>
    <div class="vault-card" id="vault-card">
      <div class="vault-title"><span>01</span><div><b>Tu expediente privado</b><small>Crea o desbloquea tu bóveda local</small></div></div>
      <form id="vault-form" class="vault-form">
        <label>Contraseña de cifrado<input id="vault-password" type="password" minlength="10" autocomplete="new-password" required placeholder="Mínimo 10 caracteres"></label>
        <button class="primary-btn" id="vault-submit" type="submit">Crear bóveda cifrada</button>
      </form>
      <p class="vault-note" id="vault-note">La contraseña no se guarda. Si la pierdes, este prototipo no podrá recuperar el expediente.</p>
    </div>
    <div class="workflow-content hidden" id="workflow-content">
      <div class="vault-session-actions"><button class="secondary-btn" id="lock-vault" type="button">Bloquear bóveda y salir</button></div><div class="workflow-progress" id="workflow-progress"></div>
      <div class="workflow-grid">
        <article class="workflow-panel">
          <div class="panel-title"><span>02</span><div><b>Datos del negocio</b><small>Se guardan cifrados en este dispositivo</small></div></div>
          <form id="case-form" class="case-form">
            <label>Nombre comercial<input name="businessName" required maxlength="100" placeholder="Ej. Cafetería El Parque"></label>
            <div class="case-fields">
              <label>Actividad<select name="businessType"><option value="cafe">Cafetería / alimentos</option><option value="shop">Tienda comercial</option><option value="office">Oficina / servicios</option><option value="other">Otra actividad</option></select></label>
              <label>Actividad específica<input name="activity" required maxlength="120" placeholder="Ej. venta de café y pastelería"></label>
            </div>
            <div class="case-fields">
              <label>Ciudad / cantón<input name="city" required maxlength="100" placeholder="Ej. Riobamba"></label>
              <label>Dirección del local<input name="address" required maxlength="180" placeholder="Dirección (dato privado)"></label>
            </div>
            <div class="case-fields">
              <label>Responsable del trámite<input name="ownerName" required maxlength="120" placeholder="Nombre completo"></label>
              <label>Área aproximada (m²)<input name="area" type="number" min="8" max="3000" required placeholder="Ej. 48"></label>
            </div>
            <label>Notas de distribución / necesidades<textarea name="notes" rows="3" maxlength="1200" placeholder="Entrada, baño, cocina, bodega, salida, accesibilidad..."></textarea></label>
            <div class="case-actions"><button class="primary-btn" type="submit">Guardar expediente cifrado</button><button class="secondary-btn" id="reset-case" type="button">Borrar expediente local</button></div>
            <p class="form-feedback" id="case-feedback" aria-live="polite"></p>
          </form>
        </article>
        <article class="workflow-panel plan-panel">
          <div class="panel-title"><span>03</span><div><b>Plano y adaptaciones</b><small>Esquema preliminar ajustable</small></div></div>
          <div class="plan-controls">
            <label>Frente (m)<input id="plan-width" type="number" min="2" max="100" value="8"></label>
            <label>Fondo (m)<input id="plan-depth" type="number" min="2" max="100" value="6"></label>
          </div>
          <div class="plan-measure-label" id="plan-measure-label">Medidas calculadas del área</div>
          <label class="plan-tool-label">Área para colocar<select id="plan-tool">
            <option value="kitchen">♨ Cocina</option><option value="restroom">🚻 Baño</option><option value="storage">▤ Bodega</option><option value="counter">▣ Caja / atención</option><option value="public">♙ Área pública</option><option value="entrance">↘ Entrada</option><option value="exit">⇧ Salida</option><option value="fire">🧯 Extintor</option><option value="firstaid">✚ Primeros auxilios</option><option value="accessible">♿ Accesibilidad</option>
          </select></label>
          <p class="plan-instruction">Toca las celdas para ubicar cocina, baño y demás áreas. Puedes cambiar la distribución libremente.</p>
          <div class="editable-plan" id="editable-plan" aria-label="Plano interactivo del local"></div>
          <div class="plan-preview-wrap"><b>Vista previa · señalética y circulación</b><div id="plan-visual-preview" class="plan-visual-preview"></div></div>
          <div class="plan-key"><span>🟩 Flujo sugerido</span><span>🟥 Señales referenciales</span><span>🟦 Distribución elegida</span></div>
          <div class="plan-actions"><button class="secondary-btn" id="save-plan" type="button">Guardar distribución</button><button class="secondary-btn" id="download-plan" type="button">Descargar plano PNG</button><button class="secondary-btn" id="attach-plan" type="button">Adjuntar plano al expediente</button><button class="secondary-btn" id="clear-plan" type="button">Limpiar distribución</button></div>
          <p class="plan-warning">No es un plano técnico ni reemplaza la revisión de un profesional o la entidad competente.</p>
        </article>
      </div>
      <article class="workflow-panel requirements-panel">
        <div class="panel-title"><span>04</span><div><b>Certificados y documentos que preparar</b><small>Vista previa antes de completar y enviar</small></div></div><p class="plan-warning">LOCALIA prepara borradores y checklist, no emite permisos oficiales. Confirma la lista con la entidad competente.</p>
        <div class="generated-documents" id="generated-documents"></div><div class="requirements-output" id="requirements-output"></div>
        <div class="document-add"><label>Tipo de documento<select id="document-type"><option value="Croquis / plano">Croquis / plano</option><option value="Documento del responsable">Documento del responsable</option><option value="Respaldo de ubicación del local">Respaldo de ubicación del local</option><option value="Documento sanitario">Documento sanitario</option><option value="Documento de seguridad / prevención">Documento de seguridad / prevención</option><option value="Documento comercial / tributario">Documento comercial / tributario</option><option value="Otro documento">Otro documento</option></select></label><label>Nombre del documento<input id="document-name" maxlength="120" placeholder="Nombre o referencia del documento"></label><label>Archivo PDF o imagen (máx. 180 KB)<input id="document-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp"></label><button class="secondary-btn" id="add-document" type="button">Cifrar y añadir</button></div>
        <p class="form-feedback" id="document-feedback" aria-live="polite"></p>
      </article>
      <article class="workflow-panel submission-panel">
        <div class="panel-title"><span>05</span><div><b>Enviar a revisión</b><small>La app detecta campos faltantes, pero no aprueba permisos</small></div></div>
        <div id="submission-status"></div>
        <button class="primary-btn" id="submit-case" type="button">Enviar expediente a entidad demo</button>
      </article>
      <article class="workflow-panel reviewer-panel">
        <div class="panel-title"><span>06</span><div><b>Entidad revisora de prueba</b><small>Sandbox de demostración · no es una autoridad real</small></div></div>
        <div class="demo-warning"><b>Entidad ficticia:</b> ${DEMO_ISSUER}. No puede emitir permisos legales. Sirve para probar el flujo de revisión, correcciones y aprobación.</div>
        <button class="secondary-btn" id="open-reviewer" type="button">Abrir panel de entidad demo</button>
        <div class="reviewer-access hidden" id="reviewer-access"><label>Código de demostración<input id="reviewer-pin" type="password" placeholder="Código demo"></label><button class="secondary-btn" id="unlock-reviewer" type="button">Entrar al panel</button><p class="form-feedback" id="reviewer-feedback"></p></div>
        <div class="reviewer-workspace hidden" id="reviewer-workspace"></div>
      </article>
      <article class="workflow-panel certificate-panel hidden" id="certificate-panel">
        <div class="panel-title"><span>07</span><div><b>Certificado de demostración</b><small>Se genera únicamente tras la aprobación de la entidad demo</small></div></div>
        <div id="certificate-output"></div>
      </article>
    </div>`;
  $("#herramienta").insertAdjacentElement("afterend", section);
}
function renderProgress() {
  const steps = ["Borrador", "En revisión", "Correcciones", "Aprobación", "Certificado"];
  const current = caseData.status === "draft" ? 0 : caseData.status === "submitted" ? 1 : caseData.status === "corrections" ? 2 : caseData.status === "approved" ? 3 : 4;
  $("#workflow-progress").innerHTML = steps.map((s,i)=>`<div class="progress-step ${i<=current?"active":""}"><span>${i+1}</span>${s}</div>`).join("");
}
function updatePlanLabel() {
  const width = Number($("#plan-width").value) || 0;
  const depth = Number($("#plan-depth").value) || 0;
  $("#plan-measure-label").textContent = width > 0 && depth > 0 ? `Croquis automático · ${width.toFixed(1)} m × ${depth.toFixed(1)} m · ${(width*depth).toFixed(1)} m²` : "Ingresa medidas válidas";
}
function formFromCase() {
  const form = $("#case-form");
  for (const [key,value] of Object.entries(caseData.form || {})) if (form.elements[key]) form.elements[key].value = value;
  if (caseData.plan) { $("#plan-width").value = caseData.plan.width; $("#plan-depth").value = caseData.plan.depth; }
  updatePlanLabel();
}
function ensurePlan() {
  if (!caseData.plan) {
    const area = Number(caseData.form?.area) || 48;
    const width = Number((Math.sqrt(area * 1.25)).toFixed(1));
    caseData.plan = {width,depth:Number((area/width).toFixed(1)),cells:{"11":"kitchen","18":"restroom","21":"storage","44":"public","65":"counter","70":"entrance","9":"exit","38":"fire"}};
  }
  if (!caseData.plan.cells) caseData.plan.cells = {};
}
function planSvg() {
  ensurePlan();
  const W=800,H=480,CW=80,CH=60,cells=caseData.plan.cells||{};
  let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="800" height="480" fill="#ffffff"/><rect x="3" y="3" width="794" height="474" rx="4" fill="none" stroke="#203854" stroke-width="6"/>';
  for(let r=0;r<8;r++) for(let col=0;col<10;col++){
    const idx=String(r*10+col),key=cells[idx],a=AREA_TYPES[key];
    if(key&&a) s+='<rect x="'+(col*CW+5)+'" y="'+(r*CH+5)+'" width="70" height="50" rx="5" fill="'+a.color+'" stroke="#b9c8d9" stroke-width="1.5"/>';
    else s+='<rect x="'+(col*CW+5)+'" y="'+(r*CH+5)+'" width="70" height="50" rx="2" fill="#f8fafc" stroke="#e1e8f0" stroke-width="1"/>';
    if(key&&a) s+='<text x="'+(col*CW+40)+'" y="'+(r*CH+25)+'" text-anchor="middle" font-size="17" font-family="Arial">'+a.icon+'</text><text x="'+(col*CW+40)+'" y="'+(r*CH+42)+'" text-anchor="middle" font-size="8" font-weight="bold" fill="#32465f">'+a.label.toUpperCase()+'</text>';
  }
  const findCell=(type)=>{const k=Object.keys(cells).find(i=>cells[i]===type);return k===undefined?null:{x:(Number(k)%10)*CW+40,y:Math.floor(Number(k)/10)*CH+30};};
  const ent=findCell("entrance"),ext=findCell("exit"),pub=findCell("public")||findCell("counter");
  if(ent&&ext){
    const mid=pub||{x:(ent.x+ext.x)/2,y:(ent.y+ext.y)/2};
    s+='<path d="M '+ent.x+' '+ent.y+' L '+mid.x+' '+ent.y+' L '+mid.x+' '+mid.y+' L '+ext.x+' '+mid.y+' L '+ext.x+' '+ext.y+'" fill="none" stroke="#15936b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="13 8"/>';
    s+='<text x="'+(ent.x+8)+'" y="'+(ent.y-10)+'" font-size="12" font-weight="bold" fill="#15835e">FLUJO</text>';
  }
  Object.keys(cells).forEach(k=>{const a=AREA_TYPES[cells[k]];if(!a)return;const col=Number(k)%10,row=Math.floor(Number(k)/10),x=col*CW+62,y=row*CH+14;s+='<circle cx="'+x+'" cy="'+y+'" r="12" fill="#d93e43" stroke="#fff" stroke-width="2"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">S</text>';});
  s+='<text x="18" y="468" font-size="10" fill="#687b93">LOCALIA · CROQUIS REFERENCIAL · NO ES PLANO TÉCNICO</text></svg>';
  return s;
}
function renderPlan() {
  ensurePlan();
  const width=Number($("#plan-width").value)||caseData.plan.width||8,depth=Number($("#plan-depth").value)||caseData.plan.depth||6;
  caseData.plan.width=width;caseData.plan.depth=depth;
  $("#plan-measure-label").textContent="Croquis "+width.toFixed(1)+" m × "+depth.toFixed(1)+" m · "+(width*depth).toFixed(1)+" m² · 80 celdas editables";
  const cells=caseData.plan.cells;
  let html="";
  for(let i=0;i<80;i++){const key=cells[String(i)],a=AREA_TYPES[key];html+='<button type="button" class="plan-cell '+(a?"filled":"")+'" data-cell="'+i+'" title="'+(a?a.label:"Celda vacía")+'" style="background:'+(a?a.color:"#f8fafc")+'">'+(a?a.icon:"")+'</button>';}
  $("#editable-plan").innerHTML=html;
  const svg=planSvg();
  $("#plan-visual-preview").innerHTML='<img alt="Plano con distribución, señalética y ruta de circulación" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)+'"/>';
  $("#editable-plan").querySelectorAll("[data-cell]").forEach(btn=>btn.addEventListener("click",async()=>{
    const idx=btn.getAttribute("data-cell"),tool=$("#plan-tool").value;
    if(tool==="entrance"||tool==="exit") Object.keys(caseData.plan.cells).forEach(k=>{if(caseData.plan.cells[k]===tool)delete caseData.plan.cells[k];});
    caseData.plan.cells[idx]=tool;renderPlan();await saveEncryptedCase();
  }));
}
async function downloadPlanPng() {
  const svg=planSvg(),blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=()=>{const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=960;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob(png=>{if(!png)return;const link=document.createElement("a");link.href=URL.createObjectURL(png);link.download="LOCALIA-plano-senaletica.png";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);},"image/png");};
  img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
}
function generatedDocuments() {
  const type=caseData.form?.businessType||"cafe";
  const list=[
    {key:"application",title:"Solicitud de permiso de funcionamiento (borrador)",scope:"Datos del negocio, titular y ubicación"},
    {key:"responsible",title:"Declaración del responsable (borrador)",scope:"Datos declarados por el usuario"},
    {key:"layout",title:"Croquis, señalética y flujo (borrador)",scope:"Distribución seleccionada del local"},
    {key:"requirements",title:"Checklist de requisitos por actividad",scope:"Lista orientativa para validar con la entidad"},
    {key:"safety",title:"Ficha de preparación de seguridad (borrador)",scope:"Salida, extintor, accesibilidad y circulación"}
  ];
  if(type==="cafe")list.push({key:"sanitary",title:"Ficha de preparación sanitaria (borrador)",scope:"Actividad de alimentos; confirmar requisitos oficiales"});
  if(type==="shop")list.push({key:"commercial",title:"Ficha documental comercial (borrador)",scope:"Documentación comercial / tributaria aplicable"});
  return list;
}
function renderGeneratedDocuments() {
  const target=$("#generated-documents");if(!target)return;
  const form=caseData.form||{},docs=generatedDocuments();
  target.innerHTML='<div class="generated-doc-intro">Se prepararán '+docs.length+' documentos de trabajo según el tipo de negocio. Puedes abrirlos antes de completar los datos.</div>'+docs.map(d=>'<div class="generated-doc-row"><div><b>'+escapeHtml(d.title)+'</b><small>'+escapeHtml(d.scope)+'</small></div><button class="secondary-btn" type="button" data-doc-preview="'+d.key+'">Ver borrador</button></div>').join("")+'<div class="demo-cert-preview"><b>Constancias de demostración que la entidad emitirá después de aprobar</b>'+DEMO_CERTIFICATE_TYPES.map(d=>'<div class="generated-doc-row"><div><b>'+escapeHtml(d.title)+'</b><small>'+escapeHtml(d.scope)+'</small></div><button class="secondary-btn" type="button" data-cert-preview="'+d.key+'">Ver modelo</button></div>').join("")+'</div><div id="document-preview-area"></div>';
  target.querySelectorAll("[data-cert-preview]").forEach(btn=>btn.addEventListener("click",()=>{
    const type=DEMO_CERTIFICATE_TYPES.find(d=>d.key===btn.getAttribute("data-cert-preview"));if(!type)return;
    const preview='<div class="document-preview"><div class="doc-preview-head">LOCALIA · CERTIFICADO DEMO · NO OFICIAL</div><h3>'+escapeHtml(type.title)+'</h3><p><b>Establecimiento:</b> '+escapeHtml(form.businessName||"[Se completará con los datos del negocio]")+'</p><p><b>Actividad:</b> '+escapeHtml(form.activity||"[Actividad por completar]")+'</p><p><b>Entidad:</b> '+escapeHtml(DEMO_ISSUER)+'</p><p><b>Alcance:</b> '+escapeHtml(type.scope)+'</p><div class="doc-preview-notice">Modelo de certificado que se generará solo después de la revisión y aprobación de la entidad de prueba. No es un permiso legal ni un certificado oficial.</div><button class="secondary-btn" id="print-preview-doc" type="button">Imprimir modelo</button></div>';
    $("#document-preview-area").innerHTML=preview;$("#print-preview-doc").addEventListener("click",()=>window.print());
  }));
  target.querySelectorAll("[data-doc-preview]").forEach(btn=>btn.addEventListener("click",()=>{
    const doc=docs.find(d=>d.key===btn.getAttribute("data-doc-preview"));if(!doc)return;
    const filled=!!(form.businessName&&form.activity&&form.city&&form.address&&form.ownerName);
    const body='<div class="document-preview"><div class="doc-preview-head">LOCALIA · DOCUMENTO DE PREPARACIÓN · NO OFICIAL</div><h3>'+escapeHtml(doc.title)+'</h3><p><b>Negocio:</b> '+escapeHtml(form.businessName||"[Nombre del negocio por completar]")+'</p><p><b>Actividad:</b> '+escapeHtml(form.activity||"[Actividad por completar]")+'</p><p><b>Responsable:</b> '+escapeHtml(form.ownerName||"[Responsable por completar]")+'</p><p><b>Ubicación:</b> '+escapeHtml(form.address||"[Dirección por completar]")+', '+escapeHtml(form.city||"[Ciudad]")+'</p><p><b>Área:</b> '+escapeHtml(form.area||"[Área en m²]")+'</p><p><b>Contenido:</b> '+escapeHtml(doc.scope)+'</p><p><b>Estado:</b> '+(filled?"Borrador prellenado · revisar antes de entregar":"Plantilla previa · faltan datos")+'</p><div class="doc-preview-notice">Este documento es una plantilla de preparación de LOCALIA. No es un certificado emitido ni sustituye el formulario oficial de la entidad competente.</div><button class="secondary-btn" id="print-preview-doc" type="button">Imprimir / guardar PDF</button></div>';
    $("#document-preview-area").innerHTML=body;$("#print-preview-doc").addEventListener("click",()=>window.print());
  }));
}
function renderRequirements() {
  const form = caseData.form || {};
  const reqs = caseData.requirements?.length ? caseData.requirements : requirementList(form);
  renderGeneratedDocuments();
  $("#requirements-output").innerHTML = `<ul class="workflow-checklist">${reqs.map((r,i)=>`<li><span>${String(i+1).padStart(2,"0")}</span>${escapeHtml(r)}</li>`).join("")}</ul>
    <div class="docs-list"><b>Documentos añadidos</b>${(caseData.documents||[]).length ? caseData.documents.map(d=>`<span>📄 ${escapeHtml(d.type||"Documento")} · ${escapeHtml(d.name)} · ${d.fileName ? "archivo cifrado adjunto" : "solo referencia, sin archivo"}</span>`).join("") : "<p>Aún no has añadido documentos.</p>"}</div>`;
}
function renderSubmission() {
  const missing = requiredMissing(caseData.form || {});
  const corrections = caseData.corrections || [];
  let html = "";
  if (caseData.status === "corrections") html = `<div class="correction-note"><b>La entidad pidió correcciones.</b><p>${corrections.map(escapeHtml).join("<br>")}</p><p>Corrige los datos, guarda el expediente y vuelve a enviarlo.</p><button class="secondary-btn" id="print-user-correction">Imprimir documento de corrección</button></div>`;
  else if (caseData.status === "submitted") html = `<div class="ready-note"><b>Expediente enviado a revisión.</b><p>Espera la decisión de la entidad demo. Si solicita correcciones, aparecerán aquí.</p></div>`;
  else if (caseData.status === "approved" || caseData.status === "issued") html = `<div class="approved-note"><b>Expediente aprobado por la entidad demo.</b><p>La emisión final queda habilitada.</p></div>`;
  else if (missing.length) html = `<div class="missing-note"><b>Antes de enviar, completa:</b><p>${missing.map(escapeHtml).join(" · ")}</p></div>`;
  else html = `<div class="ready-note"><b>Expediente listo para revisión.</b><p>La entidad revisará la información y podrá aprobar o solicitar correcciones.</p></div>`;
  $("#submission-status").innerHTML = html;
  $("#submit-case").disabled = missing.length>0 || caseData.status==="submitted" || caseData.status==="approved" || caseData.status==="issued";
  const correctionPrint = $("#print-user-correction");
  if (correctionPrint) correctionPrint.addEventListener("click",()=>window.print());
  $("#submit-case").textContent = caseData.status==="submitted" ? "Expediente enviado · esperando revisión" : caseData.status==="corrections" ? "Reenviar expediente corregido" : "Enviar expediente a entidad demo";
}
function requiredDocTypes() {
  const types=["Croquis / plano","Documento del responsable","Respaldo de ubicación del local"];
  if(caseData.form?.businessType==="cafe")types.push("Documento sanitario");
  if(caseData.form?.businessType==="shop")types.push("Documento comercial / tributario");
  return types;
}
function renderReviewer() {
  const area = $("#reviewer-workspace");
  if (!area.classList.contains("hidden")) {
    if (caseData.status !== "submitted" && caseData.status !== "corrections") {
      area.innerHTML = `<div class="review-empty">No hay expediente pendiente. El usuario debe enviarlo primero.</div>`;
      return;
    }
    const missing = requiredMissing(caseData.form || {});
    const attachedFiles = (caseData.documents || []).filter(d => d.encryptedPayload);
    const requiredTypes=requiredDocTypes();
    const missingDocs=requiredTypes.filter(type=>!attachedFiles.some(d=>d.type===type)).map(type=>"Adjuntar archivo requerido: "+type+".");
    const reviewed=caseData.reviewedItems||{};
    const reviewItems=generatedDocuments();
    const reviewChecklistHtml="<div class=\"review-checklist\"><b>Verificación de documentos generados</b>"+reviewItems.map(d=>"<label><input type=\"checkbox\" class=\"review-item-check\" data-review-item=\""+d.key+"\" "+(reviewed[d.key]?"checked":"")+"> Confirmo que revisé: "+escapeHtml(d.title)+"</label>").join("")+"</div>";
    const planReviewHtml="<div class=\"review-plan-image\"><b>Plano enviado por el usuario</b><img alt=\"Plano de revisión\" src=\"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(planSvg())+"\"></div>";
    const notes = caseData.form?.notes || "";
    area.innerHTML = `<div class="review-record"><div><span class="review-label">Expediente</span><b>${escapeHtml(caseData.id)}</b></div><div><span class="review-label">Negocio</span><b>${escapeHtml(caseData.form.businessName)}</b></div><div><span class="review-label">Responsable</span><b>${escapeHtml(caseData.form.ownerName)}</b></div><div><span class="review-label">Ubicación</span><b>${escapeHtml(caseData.form.address)}, ${escapeHtml(caseData.form.city)}</b></div><div><span class="review-label">Actividad</span><b>${escapeHtml(caseData.form.activity)}</b></div><div><span class="review-label">Área</span><b>${escapeHtml(caseData.form.area)} m²</b></div><div><span class="review-label">Documentos declarados</span><b>${(caseData.documents||[]).map(d=>escapeHtml(d.type||"Documento")+": "+escapeHtml(d.name)+(d.fileName?" (archivo adjunto)":" (sin archivo)")).join(", ")||"No adjuntados"}</b></div><div><span class="review-label">Notas del usuario</span><b>${escapeHtml(notes)||"Sin notas"}</b></div></div>
      <div class="review-files"><b>Archivos disponibles para revisión</b>${(caseData.documents||[]).map((d,i)=>`<div><span>${escapeHtml(d.type||"Documento")}: ${escapeHtml(d.name)} · ${escapeHtml(d.fileName||"sin archivo")}</span><button class="secondary-btn review-file-btn" id="review-file-${i}" ${d.encryptedPayload?"":"disabled"}>Descargar para revisar</button></div>`).join("")||"<p>El usuario no añadió documentos.</p>"}</div>
      ${reviewChecklistHtml}${planReviewHtml}
      <label>Observaciones / correcciones<textarea id="review-notes" rows="3" placeholder="Indica exactamente qué falta o qué debe corregirse"></textarea></label>
      ${missing.length || missingDocs.length ? `<div class="missing-note">Pendientes detectados: ${[...missing,...missingDocs].map(escapeHtml).join(" · ")}</div>` : ""}
      <div class="review-actions"><button class="secondary-btn" id="request-corrections">Emitir documento de corrección</button><button class="primary-btn" id="approve-case">Aprobar expediente demo</button></div>
      <p class="demo-warning">La aprobación aquí es simulada y no constituye aprobación municipal ni certificado oficial.</p>`;
    (caseData.documents||[]).forEach((doc,index)=>{
      const button=$("#review-file-"+index);
      if(button && doc.encryptedPayload) button.addEventListener("click",()=>{
        const blob=new Blob([fromBase64(doc.encryptedPayload)],{type:doc.mimeType||"application/octet-stream"});
        const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=doc.fileName||"documento-expediente"; link.click(); URL.revokeObjectURL(url);
      });
    });
    area.querySelectorAll(".review-item-check").forEach(input=>input.addEventListener("change",async()=>{
      caseData.reviewedItems=caseData.reviewedItems||{};caseData.reviewedItems[input.dataset.reviewItem]=input.checked;await saveEncryptedCase();
    }));
    $("#request-corrections").addEventListener("click", async () => {
      const reviewerNotes = $("#review-notes").value.trim();
      const unchecked=generatedDocuments().filter(d=>!caseData.reviewedItems?.[d.key]).map(d=>"La entidad debe revisar: "+d.title+".");
      caseData.corrections = [...missing.map(m=>"Completar o corregir: "+m), ...missingDocs.map(m=>"Documento requerido: "+m), ...unchecked, ...(reviewerNotes ? [reviewerNotes] : [])];
      if (!caseData.corrections.length) caseData.corrections.push("La entidad solicita revisar y completar los documentos de respaldo indicados en el checklist.");
      caseData.status = "corrections";
      caseData.correctionIssuedAt = new Date().toISOString();
      await saveEncryptedCase(); renderAll();
      $("#reviewer-workspace").classList.remove("hidden"); renderReviewer();
      $("#reviewer-workspace").insertAdjacentHTML("afterbegin", `<div class="correction-document"><b>Documento de corrección LOCALIA · DEMO</b><p>${caseData.corrections.map(escapeHtml).join("<br>")}</p><button class="secondary-btn" id="print-correction">Imprimir / guardar PDF</button></div>`);
      $("#print-correction").addEventListener("click",()=>window.print());
    });
    $("#approve-case").addEventListener("click", async () => {
      const missingFiles=requiredDocTypes().filter(type=>!(caseData.documents||[]).some(d=>d.type===type&&d.encryptedPayload));
      const unchecked=generatedDocuments().filter(d=>!caseData.reviewedItems?.[d.key]);
      if(requiredMissing(caseData.form).length||missingFiles.length||unchecked.length||caseData.corrections.length){
        $("#reviewer-feedback").textContent="No se puede aprobar: faltan campos, archivos obligatorios, revisión de documentos o correcciones. "+missingFiles.join(", ")+" "+unchecked.map(d=>d.title).join(", ");
        return;
      }
      caseData.status = "approved"; caseData.approvedAt = new Date().toISOString(); caseData.approvingEntity = DEMO_ISSUER;
      await saveEncryptedCase(); renderAll();
    });
  }
}
async function issueDemoCertificate() {
  if(caseData.status!=="approved")return;
  const certificates=[];
  for(const type of DEMO_CERTIFICATE_TYPES){
    const certificateId="LOC-DEMO-"+type.key.toUpperCase()+"-"+randomHex(6).toUpperCase();
    const summary={certificateId,certificateType:type.title,scope:type.scope,businessName:caseData.form.businessName,activity:caseData.form.activity,city:caseData.form.city,issuer:DEMO_ISSUER,approvedAt:caseData.approvedAt,status:"DEMO - NOT OFFICIAL"};
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(summary)));
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    certificates.push({...summary,documentHash:hash});
  }
  caseData.certificates=certificates;caseData.certificate=certificates[0];caseData.status="issued";
  await saveEncryptedCase();
}
async function renderCertificate() {
  const panel=$("#certificate-panel");
  const list=caseData.certificates|| (caseData.certificate?[caseData.certificate]:[]);
  if(!list.length){panel.classList.add("hidden");return;}
  panel.classList.remove("hidden");
  let html="";
  for(const c of list){
    const qrPayload=c.backendStatus==="confirmed"&&c.verificationUrl?c.verificationUrl:"";
    let qr="";try{if(qrPayload)qr=await QRCode.toDataURL(qrPayload,{width:180,margin:1,errorCorrectionLevel:"M"});}catch{}
    const chainStatus=c.backendStatus==="confirmed"
      ? '<small class="chain-status">Confirmado en ME Network</small><small>Tx: <code>'+escapeHtml(c.meTxHash||"")+'</code></small><small><a href="'+escapeHtml(c.verificationUrl||"")+'" target="_blank" rel="noopener">Verificar y abrir PDF</a></small>'
      : '<small class="chain-status pending">'+escapeHtml(c.issuanceError||"Pendiente de registro automático en blockchain")+'</small>';
    html+='<div class="demo-certificate"><div class="cert-top">LOCALIA <span>CONSTANCIA DE DEMOSTRACIÓN</span></div><div class="cert-stamp">DEMO<br>NO OFICIAL</div><h3>'+escapeHtml(c.certificateType||"Constancia de flujo de aprobación")+'</h3><p>Este documento demuestra que la entidad de prueba revisó el expediente. <b>No es permiso de funcionamiento ni certificado emitido por autoridad pública.</b></p><div class="cert-data"><div><small>Establecimiento</small><b>'+escapeHtml(c.businessName)+'</b></div><div><small>Actividad</small><b>'+escapeHtml(c.activity)+'</b></div><div><small>Ciudad</small><b>'+escapeHtml(c.city)+'</b></div><div><small>Entidad demo</small><b>'+escapeHtml(c.issuer)+'</b></div><div><small>ID</small><b>'+escapeHtml(c.certificateId)+'</b></div><div><small>Fecha de aprobación</small><b>'+new Date(c.approvedAt).toLocaleString("es-EC")+'</b></div></div><div class="cert-bottom">'+(qr?'<img src="'+qr+'" alt="QR de certificado demo">':"")+'<div><small>Huella SHA-256</small><code>'+c.documentHash+'</code>'+chainStatus+'<small>El registro blockchain contiene solo ID opaco y hash; no datos personales.</small></div></div></div>';
  }
  const registered=list.filter(c=>c.backendStatus==="confirmed").length;
  const pending=list.length-registered;
  const issuanceMessage=!supabaseClient
    ? '<p class="result-disclaimer">Conecta Supabase Auth para habilitar la emisión automática segura.</p>'
    : '<p class="result-disclaimer">La emisión requiere iniciar sesión con una cuenta de entidad autorizada en Supabase. Tras aprobar, HARBOR genera el PDF, calcula SHA-256, lo guarda en Supabase, registra la huella en ME Network y activa el QR automáticamente.</p>';
  const authPanel=pending
    ? (supabaseClient
      ? '<form id="issuer-login" class="issuer-login"><label>Correo de entidad<input id="issuer-email" type="email" autocomplete="username" required></label><label>Contraseña<input id="issuer-password" type="password" autocomplete="current-password" required></label><button class="primary-btn" type="submit">Iniciar sesión y emitir automáticamente</button><p id="issuer-login-feedback" class="form-feedback" aria-live="polite"></p><button class="secondary-btn" id="issuer-retry" type="button">Reintentar emisión</button></form>'
      : '<p class="chain-status pending">Falta configurar Supabase Auth.</p>')
    : '<p class="chain-status">Todos los certificados están guardados y confirmados.</p>';
  $("#certificate-output").innerHTML=html+issuanceMessage+authPanel+'<button class="secondary-btn" id="print-cert">Imprimir vista de certificados</button><button class="secondary-btn" id="download-cert">Descargar paquete JSON</button><p class="result-disclaimer">Esta aprobación es de demostración. La blockchain verifica integridad y registro; no convierte una constancia demo en permiso oficial.</p>';
  $("#print-cert").addEventListener("click",()=>window.print());
  $("#download-cert").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(list,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="LOCALIA-certificados-demo.json";a.click();URL.revokeObjectURL(url);
  });
  if(pending&&supabaseClient){
    $("#issuer-login")?.addEventListener("submit",async(event)=>{
      event.preventDefault();
      const feedback=$("#issuer-login-feedback");feedback.textContent="Validando cuenta de entidad...";
      const {data,error}=await supabaseClient.auth.signInWithPassword({email:$("#issuer-email").value,password:$("#issuer-password").value});
      if(error){feedback.textContent="No se pudo iniciar sesión: "+error.message;return;}
      feedback.textContent="Cuenta autenticada. Iniciando emisión automática...";
      await runAutomaticIssuance(true);
    });
    $("#issuer-retry")?.addEventListener("click",()=>runAutomaticIssuance(true));
    supabaseClient.auth.getSession().then(({data})=>{
      if(data?.session) runAutomaticIssuance(false);
    });
  }
}
async function runAutomaticIssuance(force=false){
  if(!supabaseClient||issuanceInProgress||!caseData||caseData.status!=="issued")return;
  const list=caseData.certificates||(caseData.certificate?[caseData.certificate]:[]);
  const pending=list.filter(c=>c.backendStatus!=="confirmed"&&(force||!c.issuanceAttempted));
  if(!pending.length)return;
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)return;
  issuanceInProgress=true;
  try{
    for(const cert of pending){
      cert.issuanceAttempted=true;cert.issuanceError="";
      await saveEncryptedCase();
      const response=await fetch("/.netlify/functions/issue-certificate",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+session.access_token},body:JSON.stringify({...cert,ownerId:session.user.id})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"La emisión automática falló.");
      Object.assign(cert,{backendStatus:"confirmed",documentHash:result.sha256,meTxHash:result.txHash,meChainId:result.chainId,verificationUrl:result.verificationUrl,issuanceError:""});
      await saveEncryptedCase();
    }
    $("#vault-note").textContent="Certificados guardados en Supabase y confirmados en ME Network. Los QR ya permiten verificar y abrir el PDF.";
  }catch(error){
    const failed=list.find(c=>c.backendStatus!=="confirmed");
    if(failed)failed.issuanceError=error?.message||"Error de emisión";
    await saveEncryptedCase();
    $("#vault-note").textContent="La emisión no terminó: "+(error?.message||String(error));
  }finally{
    issuanceInProgress=false;
    await renderCertificate();
  }
}
function renderAll() {
  $("#vault-card").classList.add("hidden"); $("#workflow-content").classList.remove("hidden");
  renderProgress(); formFromCase(); renderPlan(); renderRequirements(); renderSubmission();
  $("#reviewer-workspace").classList.add("hidden");
  if (caseData.status==="approved") issueDemoCertificate().then(()=>{renderAll();});
  renderCertificate();
}
export function mountWorkflow() {
  renderShell();
  const stored = localStorage.getItem(STORAGE_KEY);
  $("#vault-submit").textContent = stored ? "Desbloquear expediente cifrado" : "Crear bóveda cifrada";
  $("#vault-form").addEventListener("submit", async (event)=>{
    event.preventDefault();
    const password=$("#vault-password").value;
    if(password.length<10){$("#vault-note").textContent="Usa al menos 10 caracteres.";return;}
    try {
      if(localStorage.getItem(STORAGE_KEY)) await unlockVault(password); else await createVault(password);
      $("#vault-note").textContent="Bóveda desbloqueada. Los datos se guardan cifrados localmente.";
      renderAll();
    } catch {
      cryptoKey=null; caseData=null; $("#vault-note").textContent="No se pudo desbloquear. Comprueba la contraseña. No se envió ningún dato.";
    }
  });
  $("#lock-vault").addEventListener("click",()=>{
    cryptoKey=null; caseData=null;
    $("#workflow-content").classList.add("hidden"); $("#vault-card").classList.remove("hidden");
    $("#vault-password").value=""; $("#vault-note").textContent="Bóveda bloqueada. Introduce tu contraseña para volver a abrir el expediente.";
    $("#vault-submit").textContent="Desbloquear expediente cifrado";
  });
  $("#case-form").addEventListener("submit", async (event)=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(event.currentTarget).entries());
    data.area=Number(data.area);
    caseData.form=data; caseData.requirements=requirementList(data);
    const planWidth = Number($("#plan-width").value) || 8;
    caseData.plan = { width: planWidth, depth: Math.max(2, Number((data.area / planWidth).toFixed(1))), cells: caseData.plan?.cells || {} };
    $("#plan-depth").value = caseData.plan.depth;
    updatePlanLabel();
    await saveEncryptedCase();
    $("#case-feedback").textContent="Expediente guardado y cifrado en este navegador.";
    renderRequirements(); renderSubmission();
  });
  $("#reset-case").addEventListener("click",()=>{
    if(!confirm("¿Borrar el expediente cifrado de este navegador? Esta acción no se puede deshacer."))return;
    localStorage.removeItem(STORAGE_KEY); cryptoKey=null; caseData=null; location.reload();
  });
  $("#plan-width").addEventListener("input",()=>{const width=Number($("#plan-width").value);const area=Number($("#case-form").elements.area.value);if(width>0&&area>0){$("#plan-depth").value=Math.max(2,Number((area/width).toFixed(1)));updatePlanLabel();renderPlan();}});
  $("#plan-depth").addEventListener("input",()=>{updatePlanLabel();renderPlan();});
  $("#plan-tool").addEventListener("change",()=>{});
  $("#download-plan").addEventListener("click",downloadPlanPng);
  $("#attach-plan").addEventListener("click",async()=>{
    const svg=planSvg(),blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"}),url=URL.createObjectURL(blob),img=new Image();
    img.onload=async()=>{const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=960;canvas.getContext("2d").drawImage(img,0,0,1600,960);URL.revokeObjectURL(url);canvas.toBlob(async png=>{
      if(!png)return;const bytes=new Uint8Array(await png.arrayBuffer());if(bytes.length>180*1024){$("#document-feedback").textContent="El plano generado supera 180 KB. Descárgalo y comprímelo antes de adjuntar.";return;}
      caseData.documents=caseData.documents||[];const existing=caseData.documents.findIndex(d=>d.type==="Croquis / plano"&&d.name==="Plano LOCALIA generado");
      const record={type:"Croquis / plano",name:"Plano LOCALIA generado",fileName:"LOCALIA-plano-senaletica.png",mimeType:"image/png",encryptedPayload:toBase64(bytes),addedAt:new Date().toISOString(),status:"declarado"};
      if(existing>=0)caseData.documents[existing]=record;else if(caseData.documents.length<8)caseData.documents.push(record);else{$("#document-feedback").textContent="Límite de 8 archivos alcanzado.";return;}
      await saveEncryptedCase();renderRequirements();$("#document-feedback").textContent="Plano PNG adjuntado y cifrado en el expediente.";
    },"image/png");};img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
  });
  $("#clear-plan").addEventListener("click",async()=>{caseData.plan.cells={};renderPlan();await saveEncryptedCase();});

  $("#case-form").elements.area.addEventListener("input",()=>{const area=Number($("#case-form").elements.area.value);const width=Number($("#plan-width").value)||8;if(area>0&&width>0){$("#plan-depth").value=Math.max(2,Number((area/width).toFixed(1)));updatePlanLabel();renderPlan();}});
  $("#save-plan").addEventListener("click",async()=>{
    caseData.plan={width:Number($("#plan-width").value),depth:Number($("#plan-depth").value),cells:caseData.plan?.cells||{}};
    updatePlanLabel();
    await saveEncryptedCase(); $("#case-feedback").textContent="Medidas y esquema guardados dentro del expediente cifrado.";
  });
  $("#add-document").addEventListener("click",async()=>{
    const name=$("#document-name").value.trim(); if(!name){$("#document-feedback").textContent="Escribe el nombre del documento.";return;}
    const file=$("#document-file").files?.[0];
    if(file && file.size>180*1024){$("#document-feedback").textContent="El archivo supera 180 KB. Reduce el tamaño para mantener el expediente cifrado dentro del almacenamiento local.";return;}
    if(file && !(file.type==="application/pdf" || file.type.startsWith("image/"))){$("#document-feedback").textContent="Adjunta un PDF o una imagen.";return;}
    if(caseData.documents.length>=8){$("#document-feedback").textContent="La demo admite hasta 8 archivos por expediente.";return;}
    let fileData=null;
    if(file){const bytes=new Uint8Array(await file.arrayBuffer());fileData=toBase64(bytes);}
    caseData.documents.push({type:$("#document-type").value,name,fileName:file?.name||"",mimeType:file?.type||"",encryptedPayload:fileData,addedAt:new Date().toISOString(),status:"declarado"});
    $("#document-name").value=""; $("#document-file").value=""; await saveEncryptedCase(); renderRequirements();
    $("#document-feedback").textContent="Añadido. El contenido del archivo queda dentro del expediente cifrado en este navegador. Límite demo: 180 KB por archivo, hasta 8 archivos.";
  });
  $("#submit-case").addEventListener("click",async()=>{
    const missing=requiredMissing(caseData.form);
    if(missing.length){caseData.corrections=missing;renderSubmission();return;}
    caseData.status="submitted"; caseData.submittedAt=new Date().toISOString(); caseData.corrections=[];caseData.reviewedItems={};
    await saveEncryptedCase(); renderAll();
  });
  $("#open-reviewer").addEventListener("click",()=>$("#reviewer-access").classList.toggle("hidden"));
  $("#unlock-reviewer").addEventListener("click",()=>{
    if($("#reviewer-pin").value!==DEMO_REVIEW_PIN){$("#reviewer-feedback").textContent="Código incorrecto. Solo para la demo.";return;}
    $("#reviewer-feedback").textContent="Panel demo abierto. Recuerda: mismo navegador y dispositivo, no es un portal institucional real.";
    $("#reviewer-workspace").classList.remove("hidden"); renderReviewer();
  });
}
