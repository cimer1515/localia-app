import QRCode from "qrcode";
import "./workflow.css";

const STORAGE_KEY = "localia.case.v1";
const DEMO_REVIEW_PIN = "LOCALIA-DEMO-2026";
const DEMO_ISSUER = "Entidad demostrativa LOCALIA (no oficial)";

let caseData = null;
let cryptoKey = null;
let saltBytes = null;

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
      <div class="workflow-progress" id="workflow-progress"></div>
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
          <div class="plan-measure-label" id="plan-measure-label">Medidas calculadas del área</div><div class="editable-plan" id="editable-plan" aria-label="Plano ilustrativo del local">
            <div class="plan-zone zone-work">ÁREA DE TRABAJO</div><div class="plan-zone zone-storage">BODEGA</div><div class="plan-zone zone-service">ATENCIÓN / CAJA</div><div class="plan-zone zone-public">ÁREA PÚBLICA</div><div class="plan-exit">ENTRADA / SALIDA</div><div class="plan-route">↗</div><div class="plan-fire">EXT.</div>
          </div>
          <div class="plan-key"><span>🟦 Zonas de uso</span><span>🟩 Ruta / salida</span><span>🟥 Señalética referencial</span></div>
          <button class="secondary-btn" id="save-plan" type="button">Guardar medidas y esquema</button>
          <p class="plan-warning">No es un plano técnico ni reemplaza la revisión de un profesional o la entidad competente.</p>
        </article>
      </div>
      <article class="workflow-panel requirements-panel">
        <div class="panel-title"><span>04</span><div><b>Requisitos y documentos</b><small>Checklist orientativo; no confirma requisitos oficiales</small></div></div>
        <div class="requirements-output" id="requirements-output"></div>
        <div class="document-add"><label>Nombre del documento<input id="document-name" maxlength="120" placeholder="Ej. Croquis del local / documento..."></label><label>Archivo PDF o imagen (máx. 1 MB)<input id="document-file" type="file" accept=".pdf,image/png,image/jpeg,image/webp"></label><button class="secondary-btn" id="add-document" type="button">Cifrar y añadir</button></div>
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
function renderRequirements() {
  const form = caseData.form || {};
  const reqs = caseData.requirements?.length ? caseData.requirements : requirementList(form);
  $("#requirements-output").innerHTML = `<ul class="workflow-checklist">${reqs.map((r,i)=>`<li><span>${String(i+1).padStart(2,"0")}</span>${escapeHtml(r)}</li>`).join("")}</ul>
    <div class="docs-list"><b>Documentos añadidos</b>${(caseData.documents||[]).length ? caseData.documents.map(d=>`<span>📄 ${escapeHtml(d.name)} · ${d.fileName ? "archivo cifrado adjunto" : "solo referencia, sin archivo"}</span>`).join("") : "<p>Aún no has añadido documentos.</p>"}</div>`;
}
function renderSubmission() {
  const missing = requiredMissing(caseData.form || {});
  const corrections = caseData.corrections || [];
  let html = "";
  if (caseData.status === "corrections") html = `<div class="correction-note"><b>La entidad pidió correcciones.</b><p>${corrections.map(escapeHtml).join("<br>")}</p><p>Corrige los datos, guarda el expediente y vuelve a enviarlo.</p><button class="secondary-btn" id="print-user-correction">Imprimir documento de corrección</button></div>`;
  else if (caseData.status === "approved" || caseData.status === "issued") html = `<div class="approved-note"><b>Expediente aprobado por la entidad demo.</b><p>La emisión final queda habilitada.</p></div>`;
  else if (missing.length) html = `<div class="missing-note"><b>Antes de enviar, completa:</b><p>${missing.map(escapeHtml).join(" · ")}</p></div>`;
  else html = `<div class="ready-note"><b>Expediente listo para revisión.</b><p>La entidad revisará la información y podrá aprobar o solicitar correcciones.</p></div>`;
  $("#submission-status").innerHTML = html;
  $("#submit-case").disabled = missing.length>0 || caseData.status==="approved" || caseData.status==="issued";
  const correctionPrint = $("#print-user-correction");
  if (correctionPrint) correctionPrint.addEventListener("click",()=>window.print());
  $("#submit-case").textContent = caseData.status==="corrections" ? "Reenviar expediente corregido" : "Enviar expediente a entidad demo";
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
    const missingDocs = attachedFiles.length < 2
      ? ["Adjuntar al menos 2 documentos de respaldo para la demostración (por ejemplo, croquis y documento de respaldo)."]
      : [];
    const notes = caseData.form?.notes || "";
    area.innerHTML = `<div class="review-record"><div><span class="review-label">Expediente</span><b>${escapeHtml(caseData.id)}</b></div><div><span class="review-label">Negocio</span><b>${escapeHtml(caseData.form.businessName)}</b></div><div><span class="review-label">Responsable</span><b>${escapeHtml(caseData.form.ownerName)}</b></div><div><span class="review-label">Ubicación</span><b>${escapeHtml(caseData.form.address)}, ${escapeHtml(caseData.form.city)}</b></div><div><span class="review-label">Actividad</span><b>${escapeHtml(caseData.form.activity)}</b></div><div><span class="review-label">Área</span><b>${escapeHtml(caseData.form.area)} m²</b></div><div><span class="review-label">Documentos declarados</span><b>${(caseData.documents||[]).map(d=>escapeHtml(d.name)+(d.fileName?" (archivo adjunto)":" (sin archivo)")).join(", ")||"No adjuntados"}</b></div><div><span class="review-label">Notas del usuario</span><b>${escapeHtml(notes)||"Sin notas"}</b></div></div>
      <div class="review-files"><b>Archivos disponibles para revisión</b>${(caseData.documents||[]).map((d,i)=>`<div><span>${escapeHtml(d.name)} · ${escapeHtml(d.fileName||"sin archivo")}</span><button class="secondary-btn review-file-btn" id="review-file-${i}" ${d.encryptedPayload?"":"disabled"}>Descargar para revisar</button></div>`).join("")||"<p>El usuario no añadió documentos.</p>"}</div>
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
    $("#request-corrections").addEventListener("click", async () => {
      const reviewerNotes = $("#review-notes").value.trim();
      caseData.corrections = [...missing.map(m=>`Completar o corregir: ${m}`), ...missingDocs.map(m=>`Documento requerido: ${m}`), ...(reviewerNotes ? [reviewerNotes] : [])];
      if (!caseData.corrections.length) caseData.corrections.push("La entidad solicita revisar y completar los documentos de respaldo indicados en el checklist.");
      caseData.status = "corrections";
      caseData.correctionIssuedAt = new Date().toISOString();
      await saveEncryptedCase(); renderAll();
      $("#reviewer-workspace").classList.remove("hidden"); renderReviewer();
      $("#reviewer-workspace").insertAdjacentHTML("afterbegin", `<div class="correction-document"><b>Documento de corrección LOCALIA · DEMO</b><p>${caseData.corrections.map(escapeHtml).join("<br>")}</p><button class="secondary-btn" id="print-correction">Imprimir / guardar PDF</button></div>`);
      $("#print-correction").addEventListener("click",()=>window.print());
    });
    $("#approve-case").addEventListener("click", async () => {
      if (requiredMissing(caseData.form).length || (caseData.documents||[]).filter(d=>d.encryptedPayload).length<2 || caseData.corrections.length) {
        $("#reviewer-feedback").textContent = "No se puede aprobar: primero resuelve los campos, adjunta 2 archivos de respaldo de demo y cierra las correcciones.";
        return;
      }
      caseData.status = "approved"; caseData.approvedAt = new Date().toISOString(); caseData.approvingEntity = DEMO_ISSUER;
      await saveEncryptedCase(); renderAll();
    });
  }
}
async function issueDemoCertificate() {
  if (caseData.status !== "approved") return;
  const certificateId = "LOC-DEMO-" + randomHex(8).toUpperCase();
  const approvedSummary = { certificateId, businessName: caseData.form.businessName, activity: caseData.form.activity, city: caseData.form.city, issuer: DEMO_ISSUER, approvedAt: caseData.approvedAt, status: "DEMO - NOT OFFICIAL" };
  const bytes = new TextEncoder().encode(JSON.stringify(approvedSummary));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,"0")).join("");
  caseData.certificate = { ...approvedSummary, documentHash: hash };
  caseData.status = "issued";
  await saveEncryptedCase();
}
async function renderCertificate() {
  const panel = $("#certificate-panel");
  if (!caseData.certificate) { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  const c = caseData.certificate;
  const qrPayload = `LOCALIA-DEMO-CERT|ID:${c.certificateId}|HASH:${c.documentHash}|STATUS:NOT-OFFICIAL`;
  let qr = "";
  try { qr = await QRCode.toDataURL(qrPayload, { width: 180, margin: 1, errorCorrectionLevel: "M" }); } catch {}
  $("#certificate-output").innerHTML = `<div class="demo-certificate" id="print-certificate"><div class="cert-top">LOCALIA <span>CERTIFICADO DE DEMOSTRACIÓN</span></div><div class="cert-stamp">DEMO<br>NO OFICIAL</div><h3>Constancia de flujo de aprobación</h3><p>Este documento demuestra el flujo de revisión y aprobación de LOCALIA. <b>No es permiso de funcionamiento ni documento emitido por una autoridad pública.</b></p><div class="cert-data"><div><small>Establecimiento</small><b>${escapeHtml(c.businessName)}</b></div><div><small>Actividad</small><b>${escapeHtml(c.activity)}</b></div><div><small>Ciudad</small><b>${escapeHtml(c.city)}</b></div><div><small>Entidad de prueba</small><b>${escapeHtml(c.issuer)}</b></div><div><small>Identificador</small><b>${escapeHtml(c.certificateId)}</b></div><div><small>Fecha de aprobación</small><b>${new Date(c.approvedAt).toLocaleString("es-EC")}</b></div></div><div class="cert-bottom">${qr ? `<img src="${qr}" alt="QR de certificado demo">` : ""}<div><small>Huella SHA-256 del resumen</small><code>${c.documentHash}</code><small>El hash no prueba que una entidad real haya emitido el documento. Registro en blockchain: pendiente hasta integración oficial.</small></div></div></div><button class="primary-btn" id="print-cert">Imprimir / guardar PDF</button><button class="secondary-btn" id="download-cert">Descargar constancia JSON</button>`;
  $("#print-cert").addEventListener("click",()=>window.print());
  $("#download-cert").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(c,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${c.certificateId}.json`; a.click(); URL.revokeObjectURL(url);
  });
}
function renderAll() {
  $("#vault-card").classList.add("hidden"); $("#workflow-content").classList.remove("hidden");
  renderProgress(); formFromCase(); renderRequirements(); renderSubmission();
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
  $("#case-form").addEventListener("submit", async (event)=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(event.currentTarget).entries());
    data.area=Number(data.area);
    caseData.form=data; caseData.requirements=requirementList(data);
    const planWidth = Number($("#plan-width").value) || 8;
    caseData.plan = { width: planWidth, depth: Math.max(2, Number((data.area / planWidth).toFixed(1))) };
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
  $("#plan-width").addEventListener("input",()=>{const width=Number($("#plan-width").value);const area=Number($("#case-form").elements.area.value);if(width>0&&area>0){$("#plan-depth").value=Math.max(2,Number((area/width).toFixed(1)));updatePlanLabel();}});
  $("#plan-depth").addEventListener("input",updatePlanLabel);
  $("#case-form").elements.area.addEventListener("input",()=>{const area=Number($("#case-form").elements.area.value);const width=Number($("#plan-width").value)||8;if(area>0&&width>0){$("#plan-depth").value=Math.max(2,Number((area/width).toFixed(1)));updatePlanLabel();}});
  $("#save-plan").addEventListener("click",async()=>{
    caseData.plan={width:Number($("#plan-width").value),depth:Number($("#plan-depth").value)};
    updatePlanLabel();
    await saveEncryptedCase(); $("#case-feedback").textContent="Medidas y esquema guardados dentro del expediente cifrado.";
  });
  $("#add-document").addEventListener("click",async()=>{
    const name=$("#document-name").value.trim(); if(!name){$("#document-feedback").textContent="Escribe el nombre del documento.";return;}
    const file=$("#document-file").files?.[0];
    if(file && file.size>400*1024){$("#document-feedback").textContent="El archivo supera 400 KB. Reduce el tamaño para mantener el expediente cifrado dentro del almacenamiento local.";return;}
    if(file && !(file.type==="application/pdf" || file.type.startsWith("image/"))){$("#document-feedback").textContent="Adjunta un PDF o una imagen.";return;}
    if(caseData.documents.length>=5){$("#document-feedback").textContent="La demo admite hasta 5 archivos por expediente.";return;}
    let fileData=null;
    if(file){const bytes=new Uint8Array(await file.arrayBuffer());fileData=toBase64(bytes);}
    caseData.documents.push({name,fileName:file?.name||"",mimeType:file?.type||"",encryptedPayload:fileData,addedAt:new Date().toISOString(),status:"declarado"});
    $("#document-name").value=""; $("#document-file").value=""; await saveEncryptedCase(); renderRequirements();
    $("#document-feedback").textContent="Añadido. El contenido del archivo queda dentro del expediente cifrado en este navegador. Límite demo: 400 KB por archivo, hasta 5 archivos.";
  });
  $("#submit-case").addEventListener("click",async()=>{
    const missing=requiredMissing(caseData.form);
    if(missing.length){caseData.corrections=missing;renderSubmission();return;}
    caseData.status="submitted"; caseData.submittedAt=new Date().toISOString(); caseData.corrections=[];
    await saveEncryptedCase(); renderAll();
  });
  $("#open-reviewer").addEventListener("click",()=>$("#reviewer-access").classList.toggle("hidden"));
  $("#unlock-reviewer").addEventListener("click",()=>{
    if($("#reviewer-pin").value!==DEMO_REVIEW_PIN){$("#reviewer-feedback").textContent="Código incorrecto. Solo para la demo.";return;}
    $("#reviewer-feedback").textContent="Panel demo abierto. Recuerda: mismo navegador y dispositivo, no es un portal institucional real.";
    $("#reviewer-workspace").classList.remove("hidden"); renderReviewer();
  });
}
