import QRCode from "qrcode";
import "./demo.css";

const root = document.querySelector("#localia-demo");
const sample = {
  businessName: "Cafetería Demo LOCALIA",
  activity: "Café y pastelería (ejemplo)",
  city: "Riobamba",
  issuer: "Entidad demostrativa LOCALIA (no oficial)"
};
const certificateTypes = [
  { key: "documental", title: "Constancia demo de revisión documental", scope: "Documentos adjuntos y checklist revisados" },
  { key: "plano", title: "Constancia demo de plano y señalética", scope: "Distribución, señalización y circulación del local" },
  { key: "preparacion", title: "Constancia demo de preparación del establecimiento", scope: "Resumen de preparación del establecimiento" }
];
const steps = [
  "Sin expediente",
  "Expediente creado",
  "En revisión",
  "Correcciones solicitadas",
  "Aprobado",
  "Reenviado",
  "Certificados emitidos"
];
let stage = Math.min(6, Math.max(0, Number(sessionStorage.getItem("localia-demo-stage") || 0)));

root.innerHTML = `
<div class="demo-wrap">
  <nav class="demo-nav">
    <div class="demo-brand">LOCALIA<small>BUSINESS SETUP · DEMO</small></div>
    <a class="demo-link" href="./index.html">← Volver a la app</a>
  </nav>
  <header class="demo-hero">
    <span class="demo-tag">ENTIDAD DE PRUEBA · MODO DEMOSTRACIÓN</span>
    <h1>Prueba el flujo y visualiza tus certificados.</h1>
    <p>Esta zona de prueba permite recorrer el envío, revisión, correcciones y aprobación. Los tres certificados de ejemplo están visibles desde el inicio para que puedas abrirlos e imprimirlos.</p>
  </header>
  <div class="demo-alert"><b>Importante:</b> son muestras ficticias, no permisos oficiales y no están registradas en ME Network. No conectes una wallet en esta fase. La integración blockchain se añadirá después.</div>
  <section class="demo-panel" id="workflow-demo">
    <h2>Simulador de la entidad demo</h2>
    <p>Avanza paso a paso. La simulación se ejecuta en este navegador y no envía datos a una entidad real.</p>
    <div id="demo-state" class="demo-state" aria-label="Estado del expediente"></div>
    <div class="demo-actions" id="demo-actions"></div>
    <div class="demo-feedback" id="demo-feedback" aria-live="polite"></div>
  </section>
  <section class="demo-panel">
    <div id="certificates-heading">
      <h2>Certificados demo de ejemplo</h2>
      <p>Abre cada constancia o guarda su PDF individualmente. Los documentos se muestran incluso antes de aprobar el expediente para facilitar la prueba visual.</p>
    </div>
    <div id="certificates" class="cert-grid"><div class="demo-loading">Generando certificados de muestra…</div></div>
  </section>
  <footer class="demo-footer">LOCALIA · Prototipo de hackathon · Datos ficticios · Sin registro blockchain</footer>
</div>`;

const actionsByStage = {
  0: [{ label: "Crear expediente de ejemplo", next: 1, message: "Expediente demo creado con datos ficticios." }],
  1: [{ label: "Enviar a entidad demo", next: 2, message: "Expediente enviado a revisión simulada." }],
  2: [
    { label: "Solicitar correcciones", next: 3, message: "La entidad demo emitió observaciones: revisar documentos y plano." },
    { label: "Aprobar expediente demo", next: 4, message: "La entidad de prueba aprobó el expediente simulado." }
  ],
  3: [{ label: "Corregir y reenviar", next: 5, message: "Correcciones demo guardadas y expediente reenviado." }],
  5: [
    { label: "Solicitar nuevas correcciones", next: 3, message: "La entidad demo solicitó otra corrección de ejemplo." },
    { label: "Aprobar expediente demo", next: 4, message: "La entidad de prueba aprobó el expediente simulado." }
  ],
  4: [{ label: "Emitir 3 certificados demo", next: 6, message: "Se emitieron las tres constancias de demostración." }],
  6: [{ label: "Reiniciar simulación", next: 0, message: "Simulación reiniciada. Los certificados demo siguen disponibles." }]
};

function renderStage(message = "") {
  document.querySelector("#demo-state").innerHTML = steps.map((name, index) =>
    `<span class="state-pill ${index <= stage ? "active" : ""}">${String(index + 1).padStart(2, "0")} · ${name}</span>`
  ).join("");

  const actions = actionsByStage[stage] || [];
  const reset = stage === 6 ? [] : [{ label: "Reiniciar simulación", next: 0, message: "Simulación reiniciada." }];
  document.querySelector("#demo-actions").innerHTML = [...actions, ...reset].map((action, index) =>
    `<button type="button" class="demo-btn ${index === 0 ? "primary" : ""}" data-next="${action.next}" data-message="${action.message}">${action.label}</button>`
  ).join("");

  document.querySelectorAll("#demo-actions [data-next]").forEach(button => {
    button.addEventListener("click", () => {
      stage = Number(button.dataset.next);
      sessionStorage.setItem("localia-demo-stage", String(stage));
      renderStage(button.dataset.message);
    });
  });
  document.querySelector("#demo-feedback").textContent = message;
}

async function buildCertificates() {
  const records = [];
  for (const [index, type] of certificateTypes.entries()) {
    const id = `LOC-DEMO-${type.key.toUpperCase()}-000${index + 1}`;
    const record = {
      id,
      ...type,
      ...sample,
      issuedAt: new Date().toISOString(),
      status: "DEMO · NO OFICIAL"
    };
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(record)));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const qr = await QRCode.toDataURL(
      `LOCALIA-DEMO|ID:${id}|SHA256:${hash}|NOT-ON-CHAIN`,
      { width: 200, margin: 1, errorCorrectionLevel: "M" }
    );
    records.push({ ...record, hash, qr });
  }

  const target = document.querySelector("#certificates");
  target.innerHTML = records.map(certificate => `
    <article class="certificate-card" data-cert-id="${certificate.id}">
      <div class="cert-head">
        <div class="cert-brand">LOCALIA<small>CONSTANCIA DE DEMOSTRACIÓN</small></div>
        <div class="cert-stamp">DEMO<br>NO OFICIAL</div>
      </div>
      <h3 class="cert-title">${certificate.title}</h3>
      <p class="cert-notice">Documento de muestra para probar el prototipo. No es un permiso de funcionamiento ni una certificación emitida por una autoridad pública.</p>
      <div class="cert-fields">
        <div><small>Establecimiento</small><b>${certificate.businessName}</b></div>
        <div><small>Actividad</small><b>${certificate.activity}</b></div>
        <div><small>Ciudad</small><b>${certificate.city}</b></div>
        <div><small>Entidad revisora</small><b>${certificate.issuer}</b></div>
        <div><small>ID demo</small><b>${certificate.id}</b></div>
        <div><small>Alcance</small><b>${certificate.scope}</b></div>
        <div><small>Estado</small><b>${certificate.status}</b></div>
      </div>
      <div class="cert-proof">
        <img src="${certificate.qr}" alt="QR del certificado de demostración">
        <div><small>Huella SHA-256 de ejemplo</small><br><code>${certificate.hash}</code><span class="chain-label">Sin transacción · No registrado en blockchain</span></div>
      </div>
      <div class="cert-actions">
        <button class="demo-btn primary" type="button" data-print="${certificate.id}">Imprimir / guardar PDF individual</button>
        <button class="demo-btn" type="button" data-open="${certificate.id}">Ver certificado</button>
      </div>
    </article>`
  ).join("");

  document.querySelectorAll("[data-print]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".certificate-card").forEach(card => card.removeAttribute("data-print-selected"));
      document.querySelector(`[data-cert-id="${button.dataset.print}"]`).setAttribute("data-print-selected", "true");
      window.print();
    });
  });
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
      const card = document.querySelector(`[data-cert-id="${button.dataset.open}"]`);
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("cert-highlight");
      window.setTimeout(() => card.classList.remove("cert-highlight"), 1200);
    });
  });
}

renderStage();
buildCertificates().catch(error => {
  document.querySelector("#certificates").innerHTML = "<p>No se pudieron generar los QR. Recarga la página e inténtalo de nuevo.</p>";
  console.error(error);
});
window.addEventListener("afterprint", () => {
  document.querySelectorAll(".certificate-card").forEach(card => card.removeAttribute("data-print-selected"));
});
