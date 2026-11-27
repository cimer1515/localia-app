import "./style.css";
import { mountWorkflow } from "./workflow.js";

const app = document.querySelector("#app");

const requirementsByType = {
  cafe: [
    "Identificar permisos municipales aplicables",
    "Consultar requisitos de seguridad y prevención de incendios",
    "Revisar condiciones sanitarias para preparación de alimentos",
    "Preparar documentación del titular y del establecimiento",
    "Definir señalética y rutas de circulación"
  ],
  shop: [
    "Consultar patente o autorización municipal aplicable",
    "Revisar requisitos de seguridad del establecimiento",
    "Verificar condiciones de accesibilidad y circulación",
    "Preparar documentación del titular y del local"
  ],
  office: [
    "Consultar autorización municipal según actividad",
    "Revisar condiciones de seguridad y evacuación",
    "Preparar documentación del titular y del establecimiento"
  ]
};

const businessNames = { cafe: "Cafetería / restaurante", shop: "Tienda comercial", office: "Oficina / servicios" };

app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#top" aria-label="LOCALIA inicio"><span class="brand-mark">L</span><span>LOCALIA<small>BUSINESS SETUP</small></span></a>
    <nav><a href="#como-funciona">Cómo funciona</a><a href="#herramienta">Diseñar mi local</a></nav>
    <a class="top-cta" href="#herramienta">Comenzar <span>↗</span></a>
  </header>
  <main id="top">
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="pulse"></span> TU NEGOCIO, LISTO PARA DAR EL PRIMER PASO</div>
        <h1>De una idea<br> a un <em>local listo.</em></h1>
        <p>Organiza los requisitos, prepara tus documentos y visualiza cómo acondicionar tu establecimiento desde un solo lugar.</p>
        <div class="hero-actions"><a class="primary-btn" href="#herramienta">Preparar mi negocio <span>→</span></a><a class="text-btn" href="#como-funciona">Conoce cómo funciona</a></div>
        <div class="hero-note"><span class="note-icon">✓</span> Guía personalizada · Diseño visual · Checklist</div>
      </div>
      <div class="hero-visual" aria-label="Vista previa de diseño de un local">
        <div class="visual-top"><span class="live-dot"></span> VISTA PREVIA DEL LOCAL <span class="visual-tag">BORRADOR</span></div>
        <div class="mini-plan">
          <div class="room kitchen">COCINA <span>♨</span></div><div class="room stock">BODEGA</div><div class="room counter">CAJA / RECEPCIÓN</div>
          <div class="tables"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="exit">SALIDA <b>↗</b></div><div class="route"></div><div class="sign sign1">✚</div><div class="sign sign2">↗</div>
        </div>
        <div class="visual-bottom"><span><b>48 m²</b><small>Área ilustrativa</small></span><span><b>5</b><small>Zonas sugeridas</small></span><span><b>6</b><small>Señales de referencia</small></span></div>
        <div class="floating-card"><span class="float-check">✓</span><div><b>Tu guía está tomando forma</b><small>Requisitos y esquema en un solo flujo</small></div></div>
      </div>
    </section>
    <section class="feature-strip" id="como-funciona"><div><span>01</span><b>Conoce tus requisitos</b><small>Una ruta según tu actividad y ubicación.</small></div><div><span>02</span><b>Organiza tus documentos</b><small>Checklist para avanzar paso a paso.</small></div><div><span>03</span><b>Visualiza tu local</b><small>Distribución y señalética sugerida.</small></div></section>
    <section class="network-section" id="me-network">
      <div class="network-card">
        <div class="network-badge"><span class="live-dot"></span> CERTIFICADO · REVISIÓN · BLOCKCHAIN</div>
        <div class="network-content"><h2>La blockchain entra <em>después de aprobar.</em></h2><p>La entidad revisa el expediente, solicita correcciones si faltan datos y aprueba. Solo entonces se prepara el certificado y se registra su huella en ME Network. Los datos personales permanecen fuera de la cadena.</p></div>
        <div class="network-action"><span class="network-status">Conexión blockchain: pendiente de configuración oficial y despliegue del contrato.</span></div>
      </div>
    </section>
    <section class="tool-section" id="herramienta">
      <div class="section-heading"><div><div class="eyebrow">PRIMERA HERRAMIENTA</div><h2>Comienza a preparar<br><em>tu establecimiento.</em></h2></div><p>Cuéntanos lo básico. LOCALIA generará una guía inicial para que sepas qué revisar y cómo organizar tu espacio.</p></div>
      <div class="tool-card">
        <div class="form-side"><div class="step-label">PASO 1 <span>· Información del negocio</span></div><form id="business-form">
          <label>¿Qué tipo de negocio quieres abrir?<select id="business-type"><option value="cafe">Cafetería / restaurante</option><option value="shop">Tienda comercial</option><option value="office">Oficina / servicios</option></select></label>
          <label>Ciudad<select id="city"><option>Riobamba</option><option>Quito</option><option>Guayaquil</option><option>Cuenca</option><option>Otra ciudad</option></select></label>
          <div class="field-row"><label>Área aproximada (m²)<input id="area" type="number" min="8" max="1000" value="48" required></label><label>Frente (m)<input id="width" type="number" min="2" max="100" value="8" required></label></div>
          <button class="primary-btn full" type="submit">Generar mi guía <span>→</span></button><p class="form-disclaimer">El resultado es orientativo. Los requisitos oficiales deben confirmarse con las entidades competentes.</p>
        </form></div>
        <div class="result-side" id="result"><div class="result-placeholder"><div class="placeholder-icon">⌘</div><h3>Tu guía aparecerá aquí</h3><p>Completa la información y genera una primera lista de requisitos junto a un esquema de distribución ilustrativo.</p></div></div>
      </div>
    </section>
    <section class="trust-note"><span class="shield">◇</span><div><b>Preparación clara. Decisiones mejor informadas.</b><p>LOCALIA ayuda a organizar y visualizar. No emite permisos oficiales ni reemplaza la revisión técnica o la aprobación de las autoridades.</p></div></section>
  </main>
  <footer><a class="brand footer-brand" href="#top"><span class="brand-mark">L</span><span>LOCALIA<small>BUSINESS SETUP</small></span></a><span>Construyendo el camino para abrir tu negocio.</span><span>Hackathon prototype · 2026</span></footer>
`;

mountWorkflow();

const form = document.querySelector("#business-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const type = document.querySelector("#business-type").value;
  const city = document.querySelector("#city").value;
  const area = Number(document.querySelector("#area").value);
  const width = Number(document.querySelector("#width").value);
  if (!area || area < 8 || !width || width < 2) return;
  const length = Math.max(2, area / width).toFixed(1);
  const requirements = requirementsByType[type];
  document.querySelector("#result").innerHTML = `
    <div class="result-content"><div class="result-header"><div><span class="result-kicker">GUÍA INICIAL · ${city.toUpperCase()}</span><h3>${businessNames[type]}</h3></div><span class="draft-pill">BORRADOR</span></div>
    <div class="generated-plan"><div class="plan-label">ESQUEMA ILUSTRATIVO <span>${width} × ${length} m</span></div><div class="generated-room"><div class="zone z-kitchen">Área de trabajo</div><div class="zone z-store">Almacenamiento</div><div class="zone z-counter">Atención / caja</div><div class="zone z-seats">Área de clientes</div><div class="plan-door">ENTRADA / SALIDA</div><div class="plan-arrow">↗</div><div class="plan-ext">EXT.</div></div></div>
    <div class="checklist-head"><h4>Tu checklist inicial</h4><span>${requirements.length} puntos</span></div><ul class="requirements">${requirements.map((r,i)=>`<li><span>${String(i+1).padStart(2,"0")}</span>${r}</li>`).join("")}</ul>
    <div class="suggested-signs"><b>Señalética para revisar</b><div><span>↗ Salida</span><span>✚ Extintor</span><span>♿ Accesibilidad</span><span>⚠ Riesgos</span></div></div>
    <p class="result-disclaimer">Lista orientativa, no exhaustiva. Verifica las normas vigentes de tu ciudad y actividad antes de realizar obras o solicitar permisos.</p></div>`;
  document.querySelector("#result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});
