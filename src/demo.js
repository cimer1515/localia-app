import QRCode from "qrcode";
import "./demo.css";

const root=document.querySelector("#localia-demo");
const STORAGE="localia.single-flow.demo.v1";
const areas=["Cocina","Baño","Bodega","Caja / atención","Área de clientes","Entrada","Salida","Extintor","Primeros auxilios","Accesibilidad"];
const certTypes=[
 {key:"municipal",title:"Formato demo · Solicitud de funcionamiento",scope:"Datos generales del establecimiento y responsable"},
 {key:"safety",title:"Formato demo · Seguridad y señalética",scope:"Distribución, señalización y circulación del local"},
 {key:"sanitary",title:"Formato demo · Revisión sanitaria / actividad",scope:"Actividad declarada y preparación del establecimiento"}
];
const initial={business:{businessName:"",businessType:"cafeteria",activity:"",city:"Riobamba",address:"",owner:"",area:"48",email:""},docs:{registration:"",ownerId:"",addressProof:"",notes:""},selectedAreas:[],planCells:{},planNotes:"",stage:"draft",reviewNote:"",correction:"",reviewedAt:null};
let state;
try{state={...initial,...JSON.parse(localStorage.getItem(STORAGE)||"{}"),business:{...initial.business,...(JSON.parse(localStorage.getItem(STORAGE)||"{}").business||{})},docs:{...initial.docs,...(JSON.parse(localStorage.getItem(STORAGE)||"{}").docs||{})}};}catch{state=structuredClone(initial);}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=s=>document.querySelector(s);
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{setNotice("No se pudo guardar en este navegador. Exporta o imprime tus resultados de prueba.");}}
function setNotice(msg){const n=$("#notice");if(n)n.textContent=msg;}
function validBusiness(){const b=state.business;return !!(b.businessName.trim()&&b.activity.trim()&&b.city.trim()&&b.address.trim()&&b.owner.trim()&&Number(b.area)>=8);}
function validDocs(){return !!(state.docs.registration.trim()&&state.docs.ownerId.trim()&&state.docs.addressProof.trim()&&state.planNotes.trim()&&Object.values(state.planCells).length>=2);}
function canSubmit(){return validBusiness()&&validDocs();}
function render(){
root.innerHTML=`<div class="demo-wrap single-flow">
<header class="demo-nav"><div class="demo-brand">LOCALIA<small>EXPEDIENTE DIGITAL · DEMO</small></div><span class="demo-chip">UNA SOLA PANTALLA</span></header>
<section class="demo-hero"><span class="demo-tag">PRUEBA DE USUARIO + ENTIDAD SIMULADA</span><h1>Completa tu negocio,<br><em>revisa y envía.</em></h1><p>Ingresa los datos una sola vez. LOCALIA prepara los formatos y certificados de vista previa. Envíalos a la entidad demo y, cuando apruebe, verás los certificados aprobados en esta misma página.</p></section>
<div class="demo-alert"><b>Solo demostración:</b> usa datos ficticios. Este prototipo guarda el expediente en este navegador y no tiene revisión oficial ni conexión con ME Network. No ingreses información personal real.</div>
<div class="flow-status" id="flow-status"></div>
<form id="applicant-form" class="single-form">
<section class="demo-panel" id="business-panel"><div class="panel-heading"><span>01</span><div><h2>Datos del negocio</h2><p>Completa los datos del establecimiento y del solicitante.</p></div></div>
<div class="demo-form">
${field("businessName","Nombre comercial",state.business.businessName)}
<label class="demo-field"><span>Tipo de negocio *</span><select name="businessType"><option value="cafeteria" ${state.business.businessType==="cafeteria"?"selected":""}>Cafetería / restaurante</option><option value="tienda" ${state.business.businessType==="tienda"?"selected":""}>Tienda comercial</option><option value="oficina" ${state.business.businessType==="oficina"?"selected":""}>Oficina / servicios</option><option value="otro" ${state.business.businessType==="otro"?"selected":""}>Otra actividad</option></select></label>
${field("activity","Actividad específica",state.business.activity)}
${field("city","Ciudad / cantón",state.business.city)}
${field("address","Dirección del local",state.business.address)}
${field("owner","Responsable del trámite",state.business.owner)}
${field("area","Área aproximada (m²)",state.business.area,"number")}
${field("email","Correo de contacto (opcional)",state.business.email,"email",false)}
</div></section>
<section class="demo-panel"><div class="panel-heading"><span>02</span><div><h2>Datos y formatos para los certificados</h2><p>Escribe la referencia de los documentos que entregarías a la entidad. En la prueba no necesitas documentos oficiales.</p></div></div>
<div class="demo-form">
${field("registration","Registro / permiso del negocio (referencia)",state.docs.registration)}
${field("ownerId","Identificación del responsable (referencia ficticia)",state.docs.ownerId)}
${field("addressProof","Comprobante de dirección (referencia)",state.docs.addressProof)}
<label class="demo-field wide"><span>Observaciones o datos adicionales</span><textarea name="notes" rows="3">${esc(state.docs.notes)}</textarea></label>
<label class="demo-field wide"><span>Adjuntar archivos de muestra (opcional)</span><input type="file" name="attachments" accept=".pdf,.jpg,.jpeg,.png" multiple><small id="attachment-names">Los archivos se usan solo para probar el selector; no se cargan a un servidor.</small></label>
</div></section>
<section class="demo-panel"><div class="panel-heading"><span>03</span><div><h2>Distribución del local y señalética</h2><p>Selecciona las áreas que existen. Toca las celdas del plano para colocar o mover cada área.</p></div></div>
<div class="plan-editor"><label class="demo-field"><span>Área o elemento que vas a dibujar</span><select id="area-tool">${areas.map(a=>'<option>'+esc(a)+'</option>').join("")}<option value="__ERASE__">Borrar área</option></select></label><p class="plan-help">Toca y arrastra sobre los cuadritos para formar un rectángulo. En el celular, mantén presionado y desliza.</p><div id="area-grid" class="area-grid" aria-label="Plano cuadriculado interactivo"></div><div class="plan-legend"><span>🟦 Área seleccionada</span><span>🟩 Ruta de circulación sugerida</span><span>🟥 Señalética referencial</span></div><div class="plan-image-panel"><h3>Imagen de distribución y seguridad</h3><p>LOCALIA propone ubicación de señales, extintor y botiquín según las áreas marcadas.</p><div id="plan-image"></div><button type="button" class="demo-btn primary" id="download-plan">Descargar imagen del plano (PNG)</button></div></div>
<label class="demo-field wide"><span>Describe entradas, flujo, adaptaciones o señalética requerida *</span><textarea name="planNotes" rows="3" required>${esc(state.planNotes)}</textarea></label><p class="plan-caution">Croquis ilustrativo de preparación. No es un plano técnico ni reemplaza la revisión profesional.</p></section>
<section class="demo-panel"><div class="panel-heading"><span>04</span><div><h2>Certificados y formatos generados</h2><p>Se generan para revisar antes de enviar. En esta etapa llevan la marca BORRADOR / NO APROBADO.</p></div></div><div id="draft-certs" class="cert-grid"><p>Completa los campos obligatorios para generar la vista previa personalizada.</p></div></section>
<section class="demo-panel submission-panel"><div class="panel-heading"><span>05</span><div><h2>Enviar expediente</h2><p>La entidad demo revisará los datos y podrá pedir correcciones o aprobar.</p></div></div><div id="submission-message" class="demo-feedback"></div><button class="demo-btn primary full" id="send-case" type="button">Enviar expediente a entidad demo</button><button class="demo-btn full" id="resend-case" type="button" hidden>Corregir y reenviar expediente</button><p id="notice" class="demo-feedback" aria-live="polite"></p></section>
<section class="demo-panel"><div class="panel-heading"><span>06</span><div><h2>Entidad revisora de prueba</h2><p>Simulación de una entidad. No representa a un organismo oficial.</p></div></div><div class="reviewer-note" id="reviewer-note">El expediente aparecerá aquí después de enviarlo.</div><div class="demo-actions" id="reviewer-actions"></div></section>
<section class="demo-panel"><div class="panel-heading"><span>07</span><div><h2>Certificados aprobados</h2><p>Se mostrarán aquí únicamente después de la aprobación simulada.</p></div></div><div id="approved-certs" class="cert-grid"><p class="cert-placeholder">Aún no hay certificados aprobados.</p></div></section>
</form>
<footer class="demo-footer">LOCALIA · Hackathon prototype · Certificados ficticios · Sin blockchain</footer></div>`;
bind();drawGrid();updatePreview();renderStatus();renderReviewer();if(state.stage==="approved")renderApproved().catch(e=>setNotice("Error al preparar certificados: "+e.message));
}
function field(name,label,value,type="text",required=true){return '<label class="demo-field"><span>'+label+(required?' *':'')+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>';}
function bind(){
$("#applicant-form").addEventListener("input",e=>{if(e.target.name){if(["businessName","businessType","activity","city","address","owner","area","email"].includes(e.target.name))state.business[e.target.name]=e.target.value;else if(["registration","ownerId","addressProof","notes"].includes(e.target.name))state.docs[e.target.name]=e.target.value;else if(e.target.name==="planNotes")state.planNotes=e.target.value;save();updatePreview();renderStatus();}});
$("#applicant-form").addEventListener("change",e=>{if(e.target.name==="attachments"){const names=Array.from(e.target.files||[]).map(f=>f.name);$("#attachment-names").textContent=names.length?names.join(" · "):"No se seleccionaron archivos.";setNotice("Archivos seleccionados localmente; no se han subido.");}});
$("#send-case").addEventListener("click",()=>{readForm();if(!canSubmit()){setNotice("Completa los datos obligatorios, las 3 referencias documentales, selecciona al menos 2 áreas y describe la distribución.");document.querySelector("#business-panel").scrollIntoView({behavior:"smooth"});return;}if(state.stage==="corrections"){state.stage="resubmitted";}else state.stage="submitted";state.reviewNote="";save();renderStatus();renderReviewer();setNotice("Expediente enviado a la entidad demo.");$("#reviewer-note").scrollIntoView({behavior:"smooth",block:"center"});});
$("#resend-case").addEventListener("click",()=>{$("#send-case").click();});
$("#area-tool").addEventListener("change",drawGrid);
}
function readForm(){const f=new FormData($("#applicant-form"));for(const k of ["businessName","businessType","activity","city","address","owner","area","email"])state.business[k]=f.get(k)||"";for(const k of ["registration","ownerId","addressProof","notes"])state.docs[k]=f.get(k)||"";state.planNotes=f.get("planNotes")||"";}
let dragStart=null,dragCurrent=null,dragging=false;
function drawGrid(){
 const grid=$("#area-grid");if(!grid)return;grid.innerHTML="";
 for(let i=0;i<60;i++){
  const a=state.planCells[i],btn=document.createElement("button");btn.type="button";btn.dataset.cell=String(i);
  btn.className="area-cell"+(a?" occupied":"");btn.textContent=a?areaShort(a):"";btn.title=(a||"Celda libre")+" · celda "+(i+1);
  grid.appendChild(btn);
 }
 grid.onpointerdown=e=>{const cell=e.target.closest("[data-cell]");if(!cell)return;e.preventDefault();if(grid.setPointerCapture)grid.setPointerCapture(e.pointerId);dragStart=Number(cell.dataset.cell);dragCurrent=dragStart;dragging=true;paintRange();};
 grid.onpointermove=e=>{if(!dragging)return;const el=document.elementFromPoint(e.clientX,e.clientY),cell=el&&el.closest("[data-cell]");if(cell){dragCurrent=Number(cell.dataset.cell);paintRange();}};
 const finish=e=>{if(!dragging)return;const el=document.elementFromPoint(e.clientX,e.clientY),cell=el&&el.closest("[data-cell]");if(cell)dragCurrent=Number(cell.dataset.cell);applyRange();dragging=false;dragStart=null;dragCurrent=null;drawGrid();updatePlanImage();updatePreview();renderStatus();};
 grid.onpointerup=finish;grid.onpointercancel=()=>{dragging=false;dragStart=null;dragCurrent=null;paintRange();};
 $("#download-plan").onclick=downloadPlanImage;
 updatePlanImage();
}
function paintRange(){
 const grid=$("#area-grid");if(!grid)return;grid.querySelectorAll(".area-cell").forEach(el=>el.classList.remove("range-preview"));
 if(!dragging||dragStart===null||dragCurrent===null)return;
 const a=dragStart%10,b=Math.floor(dragStart/10),x=dragCurrent%10,y=Math.floor(dragCurrent/10);
 for(let row=Math.min(b,y);row<=Math.max(b,y);row++)for(let col=Math.min(a,x);col<=Math.max(a,x);col++){const el=grid.querySelector('[data-cell="'+(row*10+col)+'"]');if(el)el.classList.add("range-preview");}
}
function applyRange(){
 if(dragStart===null||dragCurrent===null)return;const tool=$("#area-tool").value;
 const x1=dragStart%10,y1=Math.floor(dragStart/10),x2=dragCurrent%10,y2=Math.floor(dragCurrent/10);
 for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){const key=String(y*10+x);if(tool==="__ERASE__")delete state.planCells[key];else state.planCells[key]=tool;}
 state.selectedAreas=Array.from(new Set(Object.values(state.planCells)));save();
}
function planSvg(){
 const W=900,H=590,ox=36,oy=42,cw=82,ch=62,gridW=10*cw,gridH=6*ch;
 const colors={"Cocina":"#fce6cc","Baño":"#dceafa","Bodega":"#e7e2f6","Caja / atención":"#fff0b8","Área de clientes":"#e2f3e9","Entrada":"#d7f0e5","Salida":"#d7f0e5","Extintor":"#fde0df","Primeros auxilios":"#d8f4e8","Accesibilidad":"#e5e8fa"};
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="100%" height="100%" rx="22" fill="#f7f9fc"/><text x="36" y="27" font-family="Arial" font-size="18" font-weight="700" fill="#173353">LOCALIA · CROQUIS DE DISTRIBUCIÓN</text><rect x="'+(ox-9)+'" y="'+(oy-9)+'" width="'+(gridW+18)+'" height="'+(gridH+18)+'" rx="8" fill="#fff" stroke="#183655" stroke-width="8"/>';
 for(let i=0;i<60;i++){const x=i%10,y=Math.floor(i/10),a=state.planCells[i],fill=colors[a]||"#fff";s+='<rect x="'+(ox+x*cw)+'" y="'+(oy+y*ch)+'" width="'+cw+'" height="'+ch+'" fill="'+fill+'" stroke="#c7d3e2" stroke-width="2"/>';}
 // Label each connected rectangular region once, avoiding repeated text in every square.
 const seen=new Set();
 for(let i=0;i<60;i++){const a=state.planCells[i];if(!a||seen.has(i))continue;const stack=[i],component=[];seen.add(i);while(stack.length){const n=stack.pop();component.push(n);const x=n%10,y=Math.floor(n/10),neighbors=[x>0?n-1:-1,x<9?n+1:-1,y>0?n-10:-1,y<5?n+10:-1];neighbors.forEach(q=>{if(q>=0&&!seen.has(q)&&state.planCells[q]===a){seen.add(q);stack.push(q);}});}const cx=component.reduce((sum,n)=>sum+n%10+.5,0)/component.length,cy=component.reduce((sum,n)=>sum+Math.floor(n/10)+.5,0)/component.length;s+='<text x="'+(ox+cx*cw)+'" y="'+(oy+cy*ch+5)+'" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#304963" stroke="#fff" stroke-width="3" paint-order="stroke">'+svgEsc(areaShort(a))+'</text>';}
 const points={};Object.entries(state.planCells).forEach(([k,a])=>{if(!points[a])points[a]=[];points[a].push(Number(k));});
 function center(a){const arr=points[a]||[];if(!arr.length)return null;return {x:ox+(arr.reduce((n,i)=>n+i%10+.5,0)/arr.length)*cw,y:oy+(arr.reduce((n,i)=>n+Math.floor(i/10)+.5,0)/arr.length)*ch};}
 const exit=center("Salida")||center("Entrada")||{x:ox+gridW-cw/2,y:oy+gridH/2};
 // Green evacuation arrows from occupied zones toward the selected exit.
 Object.keys(points).filter(a=>!["Salida","Entrada","Extintor","Primeros auxilios"].includes(a)).forEach(a=>{const p=center(a);if(!p)return;const dx=exit.x-p.x,dy=exit.y-p.y,dist=Math.max(1,Math.hypot(dx,dy)),x=p.x+dx/dist*18,y=p.y+dy/dist*18,tx=exit.x-dx/dist*25,ty=exit.y-dy/dist*25;s+='<path d="M '+x+' '+y+' L '+tx+' '+ty+'" stroke="#1d9b6c" stroke-width="5" stroke-dasharray="10 8" fill="none" marker-end="url(#arrow)"/>';});
 s=s.replace('<rect width="100%"','<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#1d9b6c"/></marker></defs><rect width="100%"');
 function badge(p,label,bg,fg){if(!p)return "";return '<g><circle cx="'+p.x+'" cy="'+p.y+'" r="22" fill="'+bg+'" stroke="#fff" stroke-width="3"/><text x="'+p.x+'" y="'+(p.y+5)+'" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="'+fg+'">'+label+'</text></g>';}
 s+=badge(center("Salida")||center("Entrada"),"SAL","#1d9b6c","#fff");
 const ext=center("Extintor")||center("Cocina")||{x:ox+cw*7.5,y:oy+ch*.5};s+=badge(ext,"EXT","#d83232","#fff");
 const aid=center("Primeros auxilios")||center("Caja / atención")||{x:ox+cw*8.5,y:oy+ch*4.5};s+=badge(aid,"PA","#16865c","#fff");
 const bath=center("Baño");if(bath)s+=badge(bath,"ACC","#4268c9","#fff");
 s+='<text x="36" y="465" font-family="Arial" font-size="14" font-weight="700" fill="#173353">LEYENDA</text><g font-family="Arial" font-size="13" fill="#304963"><text x="36" y="493">SAL · Señal de salida / evacuación</text><text x="36" y="518">EXT · Extintor (ubicación propuesta)</text><text x="36" y="543">PA · Botiquín de primeros auxilios</text><text x="480" y="493">ACC · Accesibilidad / baño</text><text x="480" y="518">Flechas verdes · flujo orientativo</text><text x="480" y="543">Colores · áreas seleccionadas</text></g><text x="36" y="574" font-family="Arial" font-size="11" fill="#78869a">Esquema ilustrativo. Verificar normativa local y ubicación con técnico competente.</text></svg>';
 return s;
}
function svgEsc(v){return String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function updatePlanImage(){const target=$("#plan-image");if(!target)return;const svg=planSvg();const uri="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);target.innerHTML='<img class="plan-generated-image" alt="Croquis generado con áreas y señalética propuesta" src="'+uri+'">';}
async function downloadPlanImage(){const svg=planSvg(),blob=new Blob([svg],{type:"image/svg+xml"}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const canvas=document.createElement("canvas");canvas.width=900;canvas.height=590;canvas.getContext("2d").drawImage(img,0,0);URL.revokeObjectURL(url);canvas.toBlob(png=>{const a=document.createElement("a");a.href=URL.createObjectURL(png);a.download="LOCALIA-croquis-senaletica.png";a.click();URL.revokeObjectURL(a.href);},"image/png");};img.onerror=()=>{URL.revokeObjectURL(url);setNotice("No se pudo exportar el plano; puedes guardar la imagen mostrada.");};img.src=url;
}
function areaShort(a){return ({ "Cocina":"COC","Baño":"BAÑ","Bodega":"BOD","Caja / atención":"CAJ","Área de clientes":"CLI","Entrada":"ENT","Salida":"SAL","Extintor":"EXT","Primeros auxilios":"PA","Accesibilidad":"ACC"})[a]||a.slice(0,3).toUpperCase();}
function renderStatus(){const labels=["Borrador","Enviada","Correcciones","Reenviada","Aprobada"];const idx=({draft:0,submitted:1,corrections:2,resubmitted:3,approved:4})[state.stage]||0;$("#flow-status").innerHTML=labels.map((x,i)=>'<span class="flow-pill '+(i<=idx?"active":"")+'">'+(i+1)+" · "+x+"</span>").join("");$("#send-case").disabled=!canSubmit()||["submitted","resubmitted","approved"].includes(state.stage);$("#resend-case").hidden=state.stage!=="corrections";$("#submission-message").textContent=state.stage==="submitted"?"En revisión por entidad demo.":state.stage==="resubmitted"?"Correcciones enviadas. El expediente vuelve a revisión y espera la decisión de la entidad.":state.stage==="corrections"?"OBSERVACIÓN DE LA ENTIDAD: "+(state.correction||"Revisa la información señalada.")+" Corrige los campos o referencias y pulsa “Corregir y reenviar expediente”.":state.stage==="approved"?"Aprobado por entidad demo. Los certificados finales están disponibles abajo.":canSubmit()?"Expediente listo. Revisa los borradores y envíalo.":"Completa los campos obligatorios para habilitar el envío.";}
function updatePreview(){const target=$("#draft-certs");if(!target)return;if(!validBusiness()){target.innerHTML='<p class="cert-placeholder">Completa nombre, actividad, ciudad, dirección, responsable y área para ver los formatos personalizados.</p>';return;}target.innerHTML=certTypes.map(t=>'<article class="certificate-card draft"><div class="cert-head"><div class="cert-brand">LOCALIA<small>DOCUMENTO DE DEMOSTRACIÓN</small></div><div class="cert-stamp">BORRADOR<br>NO APROBADO</div></div><h3 class="cert-title">'+esc(t.title)+'</h3><p class="cert-notice">Vista previa generada con los datos ingresados. No es válido como permiso ni certificado oficial.</p><div class="cert-fields">'+certFields(t)+'</div><div class="draft-mark">VISTA PREVIA · AÚN NO ENVIADO</div></article>').join("");}
function certFields(t){const b=state.business,d=state.docs;return '<div><small>Negocio</small><b>'+esc(b.businessName)+'</b></div><div><small>Actividad</small><b>'+esc(b.activity)+'</b></div><div><small>Responsable</small><b>'+esc(b.owner)+'</b></div><div><small>Ciudad / dirección</small><b>'+esc(b.city)+' · '+esc(b.address)+'</b></div><div><small>Área</small><b>'+esc(b.area)+' m²</b></div><div><small>Datos / referencia</small><b>'+esc(t.key==="municipal"?d.registration:t.key==="safety"?Object.values(state.planCells).join(", "):d.ownerId+" · "+d.addressProof)+'</b></div><div><small>Alcance</small><b>'+esc(t.scope)+'</b></div>';}
function renderReviewer(){const n=$("#reviewer-note"),actions=$("#reviewer-actions");if(!n||!actions)return;if(!["submitted","resubmitted","corrections"].includes(state.stage)){n.textContent=state.stage==="approved"?"Entidad demo: expediente aprobado.": "El expediente aparecerá aquí después de enviarlo.";actions.innerHTML="";return;}n.innerHTML='<div class="review-record"><b>Expediente de revisión demo</b><p>Negocio: '+esc(state.business.businessName)+' · Responsable: '+esc(state.business.owner)+'</p><p>Formatos recibidos: '+certTypes.length+' · Áreas: '+esc(Object.values(state.planCells).join(", ")||state.selectedAreas.join(", "))+'</p><p>Documentación: '+esc(state.docs.registration)+', '+esc(state.docs.ownerId)+', '+esc(state.docs.addressProof)+'</p></div>'+(state.stage==="corrections"?'<div class="correction-note"><b>Observación:</b> '+esc(state.correction)+'</div>':"");actions.innerHTML='<button class="demo-btn" id="demo-correction">Solicitar corrección</button><button class="demo-btn primary" id="demo-approve">Aprobar expediente demo</button>';$("#demo-correction").addEventListener("click",()=>{const note=window.prompt("Entidad demo: escribe qué dato o documento debe corregir el solicitante.","Falta completar o verificar: ");if(note===null)return;if(!note.trim()){setNotice("Escribe una observación concreta para solicitar la corrección.");return;}state.stage="corrections";state.correction=note.trim();save();renderStatus();renderReviewer();setNotice("Observación enviada al solicitante. El expediente no está aprobado.");});$("#demo-approve").addEventListener("click",()=>{state.stage="approved";state.reviewedAt=new Date().toISOString();save();renderStatus();renderReviewer();renderApproved().catch(e=>setNotice("No se pudieron crear los certificados aprobados: "+e.message));$("#approved-certs").scrollIntoView({behavior:"smooth",block:"start"});});}
async function renderApproved(){const target=$("#approved-certs");target.innerHTML="";for(const t of certTypes){const record={id:"LOCALIA-APPROVED-DEMO-"+t.key.toUpperCase(),business:state.business,docs:state.docs,areas:state.planCells,reviewedAt:state.reviewedAt,status:"APPROVED DEMO"};const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(record)))),b=>b.toString(16).padStart(2,"0")).join("");const qr=await QRCode.toDataURL("LOCALIA APPROVED DEMO | "+record.id+" | SHA256:"+hash+" | NOT ON ME NETWORK",{width:150,margin:1});const card=document.createElement("article");card.className="certificate-card approved";card.dataset.certId=record.id;card.innerHTML='<div class="cert-head"><div class="cert-brand">LOCALIA<small>CERTIFICADO APROBADO · DEMO</small></div><div class="cert-stamp approved-stamp">APROBADO<br>ENTIDAD DEMO</div></div><h3 class="cert-title">'+esc(t.title.replace("Formato demo · ","Constancia aprobada demo · "))+'</h3><p class="cert-notice">Aprobación simulada por entidad de prueba. No es autorización oficial ni está registrada en ME Network.</p><div class="cert-fields">'+certFields(t)+'</div><div class="cert-proof"><img alt="QR del certificado demo" src="'+qr+'"><div><small>Huella SHA-256</small><code>'+hash+'</code><span class="chain-label">No registrado en blockchain</span></div></div><div class="cert-actions"><button class="demo-btn primary" data-print="'+record.id+'">Imprimir / guardar PDF</button></div>';target.appendChild(card);}target.querySelectorAll("[data-print]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".certificate-card").forEach(c=>c.removeAttribute("data-print-selected"));document.querySelector('[data-cert-id="'+btn.dataset.print+'"]').setAttribute("data-print-selected","true");window.print();}));}
window.addEventListener("afterprint",()=>document.querySelectorAll(".certificate-card").forEach(c=>c.removeAttribute("data-print-selected")));
render();