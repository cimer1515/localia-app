import QRCode from "qrcode";
import "./demo.css";

const root = document.querySelector("#localia-demo");
const STORE = "localia-applicant-demo-v2";
const initial = { stage: 0, business: {}, docs: [], areas: [], plan: "", files: {}, checks: [], prepNotes: "", correction: "", certificates: false };
let data;
try { data = Object.assign({}, initial, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch { data = Object.assign({}, initial); }
const stages = ["Datos del negocio", "Formatos por completar", "En revisión", "Correcciones", "Aprobado", "Reenviado", "Certificados emitidos"];
const safe = value => String(value || "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
function save() { localStorage.setItem(STORE, JSON.stringify(data)); }
function checked(list, value) { return (list || []).includes(value) ? "checked" : ""; }
function input(name, label, value, required = true, type = "text") {
  return '<label class="demo-field"><span>' + label + (required ? ' <i>*</i>' : '') + '</span><input name="' + name + '" type="' + type + '" value="' + safe(value) + '"' + (required ? " required" : "") + '></label>';
}
function render() {
  root.innerHTML = '<div class="demo-wrap">' +
    '<nav class="demo-nav"><div class="demo-brand">LOCALIA<small>BUSINESS SETUP · DEMO</small></div><a class="demo-link" href="./index.html">← Volver a la app</a></nav>' +
    '<header class="demo-hero"><span class="demo-tag">ENTIDAD DE PRUEBA · MODO DEMOSTRACIÓN</span><h1>Completa tu negocio y solicita tus certificados demo.</h1><p>Actúa como usuario: registra los datos del establecimiento, completa los formatos de prueba y envía el expediente a la entidad simulada.</p></header>' +
    '<div class="demo-alert"><b>Entorno de prueba:</b> usa datos ficticios. La información queda guardada en este navegador. No se envía a una entidad real ni a ME Network. No conectes una wallet.</div>' +
    '<section class="demo-panel"><h2>Tu proceso</h2><div id="demo-state" class="demo-state"></div><p id="demo-status" class="demo-feedback" aria-live="polite"></p></section>' +
    '<section class="demo-panel" id="business-panel"><h2>1. Datos del negocio</h2><p>Completa los datos como si fueras el propietario de un establecimiento.</p><form id="business-form" class="demo-form">' +
      input("businessName","Nombre comercial",data.business.businessName) +
      input("activity","Actividad del negocio",data.business.activity) +
      input("owner","Nombre del responsable",data.business.owner) +
      input("taxId","RUC / identificación (dato ficticio)",data.business.taxId,false) +
      input("city","Ciudad",data.business.city || "Riobamba") +
      input("address","Dirección del establecimiento",data.business.address) +
      input("email","Correo de contacto",data.business.email,false,"email") +
      input("phone","Teléfono de contacto",data.business.phone,false,"tel") +
      '<button class="demo-btn primary" type="submit">Guardar datos y continuar</button></form></section>' +
    '<section class="demo-panel" id="forms-panel"><h2>2. Formatos demo que debes completar</h2><p>Estos son formularios de solicitud de prueba, no certificados ya emitidos. Completa cada sección y adjunta archivos de muestra si quieres probar la carga local.</p>' +
      '<form id="requirements-form"><article class="requirement-card"><span class="form-number">FORMATO DEMO 01</span><h3>Solicitud de revisión documental</h3><p>Marca los documentos de ejemplo que incluyes en tu expediente.</p>' +
      checkboxGroup("docs",["Registro o permiso del negocio","Identificación del responsable","Comprobante de dirección"],data.docs) +
      '<label class="demo-field"><span>Adjuntar documento de muestra (opcional)</span><input type="file" name="docfile" accept=".pdf,.jpg,.jpeg,.png"></label><p class="file-note" id="docfile-note">' + safe(data.files.docfile || "No se ha seleccionado archivo") + '</p></article>' +
      '<article class="requirement-card"><span class="form-number">FORMATO DEMO 02</span><h3>Plano, áreas y señalética</h3><p>Selecciona las áreas que existen en tu local. La distribución cambia según cada negocio.</p>' +
      checkboxGroup("areas",["Cocina","Baño","Bodega / almacenamiento","Área de clientes","Entrada","Salida / evacuación","Caja / atención"],data.areas) +
      '<label class="demo-field"><span>Describe brevemente la distribución y el flujo del local</span><textarea name="plan" required rows="3">' + safe(data.plan) + '</textarea></label>' +
      '<label class="demo-field"><span>Adjuntar plano o imagen (opcional)</span><input type="file" name="planfile" accept=".pdf,.jpg,.jpeg,.png"></label><p class="file-note" id="planfile-note">' + safe(data.files.planfile || "No se ha seleccionado archivo") + '</p></article>' +
      '<article class="requirement-card"><span class="form-number">FORMATO DEMO 03</span><h3>Declaración de preparación</h3><p>Marca los puntos que ya revisaste en el establecimiento.</p>' +
      checkboxGroup("checks",["Higiene y limpieza","Seguridad básica","Señalización instalada","Circulación despejada"],data.checks) +
      '<label class="demo-field"><span>Observaciones del usuario (opcional)</span><textarea name="prepNotes" rows="3">' + safe(data.prepNotes) + '</textarea></label></article>' +
      '<div class="demo-actions"><button class="demo-btn primary" type="submit">Guardar formatos</button><button class="demo-btn" type="button" id="submit-review">Enviar expediente a entidad demo</button></div><p class="demo-feedback" id="forms-feedback"></p></form></section>' +
    '<section class="demo-panel" id="review-panel"><h2>3. Revisión de entidad demo</h2><p>Este panel representa a la entidad revisora. Úsalo para simular observaciones o aprobación después de enviar el expediente.</p><div id="review-actions" class="demo-actions"></div><div id="review-feedback" class="demo-feedback"></div></section>' +
    '<section class="demo-panel" id="cert-panel"><h2>4. Certificados de prueba</h2><p>Después de la aprobación simulada, se generan tres certificados personalizados con los datos del negocio. Puedes ver e imprimir cada uno por separado.</p><div id="certificates" class="cert-grid"><p class="demo-loading">Los certificados aparecerán cuando la entidad demo apruebe y emita el expediente.</p></div></section>' +
    '<footer class="demo-footer">LOCALIA · Prototipo de hackathon · Documentos ficticios · Sin transacción blockchain</footer></div>';
  renderStage();
  bindForms();
  renderReview();
  if (data.certificates) buildCertificates().catch(showCertError);
}
function checkboxGroup(name, values, selected) {
  return '<div class="demo-check-grid">' + values.map(value => '<label class="demo-check"><input type="checkbox" name="' + name + '" value="' + safe(value) + '" ' + checked(selected,value) + '><span>' + safe(value) + '</span></label>').join("") + '</div>';
}
function renderStage() {
  document.querySelector("#demo-state").innerHTML = stages.map((name,i) => '<span class="state-pill ' + (i <= data.stage ? "active" : "") + '">' + String(i+1).padStart(2,"0") + " · " + name + "</span>").join("");
  const status = ["Empieza registrando los datos del negocio.","Completa los tres formatos demo.","La entidad de prueba está revisando el expediente.","La entidad demo dejó observaciones. Corrige y reenvía.","Expediente aprobado en la simulación.","Expediente corregido y reenviado.","Certificados de muestra emitidos."][data.stage];
  document.querySelector("#demo-status").textContent = status;
  document.querySelector("#business-panel").classList.toggle("demo-muted", data.stage > 0);
  document.querySelector("#forms-panel").classList.toggle("demo-muted", !data.business.businessName || data.stage === 6);
  document.querySelector("#review-panel").classList.toggle("demo-muted", data.stage < 2);
}
function bindForms() {
  const businessForm = document.querySelector("#business-form");
  businessForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(businessForm);
    data.business = Object.fromEntries(["businessName","activity","owner","taxId","city","address","email","phone"].map(key => [key,form.get(key)]));
    data.stage = Math.max(data.stage,1);
    save(); renderStage();
    document.querySelector("#forms-panel").scrollIntoView({behavior:"smooth",block:"start"});
  });
  const forms = document.querySelector("#requirements-form");
  forms.addEventListener("change", event => {
    if (event.target.type === "file") {
      const key = event.target.name;
      data.files[key] = event.target.files[0] ? event.target.files[0].name : "";
      const note = document.querySelector("#" + key + "-note");
      if (note) note.textContent = data.files[key] || "No se ha seleccionado archivo";
      save();
    }
  });
  forms.addEventListener("submit", event => {
    event.preventDefault(); collectRequirements(forms); save();
    document.querySelector("#forms-feedback").textContent = "Formatos guardados en este navegador.";
  });
  document.querySelector("#submit-review").addEventListener("click", () => {
    collectRequirements(forms);
    if (!data.business.businessName || !data.business.activity || !data.business.owner || !data.business.city || !data.business.address) {
      document.querySelector("#forms-feedback").textContent = "Primero guarda todos los datos obligatorios del negocio.";
      document.querySelector("#business-panel").scrollIntoView({behavior:"smooth",block:"start"}); return;
    }
    if (data.docs.length < 3 || data.areas.length < 1 || !data.plan.trim() || data.checks.length < 4) {
      save();
      document.querySelector("#forms-feedback").textContent = "Completa los 3 documentos, selecciona al menos un área, describe el plano y marca los 4 puntos de preparación.";
      return;
    }
    data.stage = data.stage === 3 ? 5 : 2; data.certificates = false; save(); renderStage(); renderReview();
    document.querySelector("#review-panel").scrollIntoView({behavior:"smooth",block:"start"});
  });
}
function collectRequirements(form) {
  const formData = new FormData(form);
  data.docs = formData.getAll("docs");
  data.areas = formData.getAll("areas");
  data.checks = formData.getAll("checks");
  data.plan = formData.get("plan") || "";
  data.prepNotes = formData.get("prepNotes") || "";
}
function renderReview() {
  const target = document.querySelector("#review-actions");
  const feedback = document.querySelector("#review-feedback");
  if (data.stage < 2) { target.innerHTML = '<span class="review-hint">Envía primero el expediente para habilitar la revisión.</span>'; feedback.textContent = ""; return; }
  if (data.stage === 6) { target.innerHTML = '<button class="demo-btn" id="reset-demo">Iniciar otra prueba desde cero</button>'; feedback.textContent = "Certificados de prueba emitidos."; document.querySelector("#reset-demo").addEventListener("click",resetDemo); return; }
  if (data.stage === 4) { target.innerHTML = '<button class="demo-btn primary" id="issue-certificates">Emitir los 3 certificados demo</button>'; feedback.textContent = "La entidad demo aprobó el expediente. Emite los certificados de prueba."; document.querySelector("#issue-certificates").addEventListener("click",() => { data.stage=6; data.certificates=true; save(); renderStage(); renderReview(); buildCertificates().catch(showCertError); document.querySelector("#cert-panel").scrollIntoView({behavior:"smooth",block:"start"}); }); return; }
  if (data.stage === 3) { target.innerHTML = '<div class="correction-note"><b>Observación de la entidad:</b> ' + safe(data.correction || "Revisa el plano y completa la información pendiente.") + '</div><button class="demo-btn primary" id="resubmit">Corregir y reenviar</button>'; feedback.textContent="Vuelve a los formatos, corrige y pulsa reenviar."; document.querySelector("#resubmit").addEventListener("click",()=>{document.querySelector("#forms-panel").scrollIntoView({behavior:"smooth",block:"start"});document.querySelector("#submit-review").textContent="Reenviar expediente corregido";}); return; }
  target.innerHTML = '<button class="demo-btn" id="request-correction">Solicitar correcciones</button><button class="demo-btn primary" id="approve-demo">Aprobar expediente demo</button>';
  feedback.textContent = data.stage === 5 ? "Expediente reenviado. La entidad puede aprobarlo o pedir otra corrección." : "Prueba ambos caminos: observaciones o aprobación.";
  document.querySelector("#request-correction").addEventListener("click",()=>{data.stage=3;data.correction="Completa o revisa los formatos de documentación, plano y señalética.";save();renderStage();renderReview();});
  document.querySelector("#approve-demo").addEventListener("click",()=>{data.stage=4;save();renderStage();renderReview();});
}
function resetDemo() { localStorage.removeItem(STORE); data=Object.assign({},initial); render(); window.scrollTo({top:0,behavior:"smooth"}); }
const types = [
  {key:"DOCUMENTAL",title:"Certificado demo de revisión documental",scope:"Revisión del checklist documental del expediente"},
  {key:"PLANO",title:"Certificado demo de plano y señalética",scope:"Distribución de áreas y señalización declaradas"},
  {key:"PREPARACION",title:"Certificado demo de preparación del establecimiento",scope:"Lista de preparación declarada por el usuario"}
];
async function buildCertificates() {
  if (!data.certificates) return;
  const target=document.querySelector("#certificates"); target.innerHTML="";
  for (let i=0;i<types.length;i++) {
    const type=types[i], id="LOCALIA-DEMO-"+type.key+"-"+String(i+1).padStart(3,"0");
    const record={id,title:type.title,scope:type.scope,business:data.business,areas:data.areas,issuedAt:new Date().toISOString(),demo:true};
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(record)));
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    const qr=await QRCode.toDataURL("LOCALIA DEMO | "+id+" | SHA256:"+hash+" | NOT ON CHAIN",{width:180,margin:1});
    const card=document.createElement("article");card.className="certificate-card";card.dataset.certId=id;
    card.innerHTML='<div class="cert-head"><div class="cert-brand">LOCALIA<small>CERTIFICADO DE PRUEBA</small></div><div class="cert-stamp">DEMO<br>NO OFICIAL</div></div><h3 class="cert-title">'+safe(type.title)+'</h3><p class="cert-notice">Muestra personalizada para probar el flujo. No es un permiso oficial ni acredita autorización legal.</p><div class="cert-fields"><div><small>Establecimiento</small><b>'+safe(data.business.businessName)+'</b></div><div><small>Actividad</small><b>'+safe(data.business.activity)+'</b></div><div><small>Responsable</small><b>'+safe(data.business.owner)+'</b></div><div><small>Ciudad</small><b>'+safe(data.business.city)+'</b></div><div><small>Dirección</small><b>'+safe(data.business.address)+'</b></div><div><small>Áreas declaradas</small><b>'+safe(data.areas.join(", "))+'</b></div><div><small>ID demo</small><b>'+id+'</b></div><div><small>Alcance</small><b>'+safe(type.scope)+'</b></div></div><div class="cert-proof"><img alt="QR de demostración" src="'+qr+'"><div><small>Huella SHA-256 de prueba</small><br><code>'+hash+'</code><span class="chain-label">No registrado en blockchain</span></div></div><div class="cert-actions"><button class="demo-btn primary" data-print="'+id+'">Imprimir / guardar PDF individual</button></div>';
    target.appendChild(card);
  }
  document.querySelectorAll("[data-print]").forEach(button=>button.addEventListener("click",()=>{document.querySelectorAll(".certificate-card").forEach(c=>c.removeAttribute("data-print-selected"));document.querySelector('[data-cert-id="'+button.dataset.print+'"]').setAttribute("data-print-selected","true");window.print();}));
}
function showCertError(error) { document.querySelector("#certificates").innerHTML="<p>No se pudieron generar los QR. Recarga la página e inténtalo de nuevo.</p>"; console.error(error); }
window.addEventListener("afterprint",()=>document.querySelectorAll(".certificate-card").forEach(c=>c.removeAttribute("data-print-selected")));
render();
