/* ============================================
   FRANZ ELECTRICIDAD PRO — FOTOS DE EVIDENCIA
   Fallas/hallazgos en relevamientos y comprobante
   de materiales/modificaciones al finalizar obra.
   Guarda las imágenes comprimidas en IndexedDB
   (no en localStorage, que tiene ~5-10MB de límite).
============================================ */

const FOTOS_DB_NAME = "franz-fotos-db";
const FOTOS_STORE = "fotos";

function abrirFotosDB(){
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("IndexedDB no disponible en este navegador/vista")); return; }
    let req;
    try { req = indexedDB.open(FOTOS_DB_NAME, 1); }
    catch(e){ reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FOTOS_STORE)) {
        const store = db.createObjectStore(FOTOS_STORE, { keyPath: "id" });
        store.createIndex("porRef", ["refTipo", "refId"], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarFotoDB(refTipo, refId, dataURL, etiqueta){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, "readwrite");
    const item = { id: uid(), refTipo, refId, dataURL, etiqueta: etiqueta||"", fecha: hoy(), ts: Date.now() };
    tx.objectStore(FOTOS_STORE).add(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

async function obtenerFotosDB(refTipo, refId){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, "readonly");
    const idx = tx.objectStore(FOTOS_STORE).index("porRef");
    const req = idx.getAll([refTipo, refId]);
    req.onsuccess = () => resolve((req.result||[]).sort((a,b)=>a.ts-b.ts));
    req.onerror = () => reject(req.error);
  });
}

async function contarFotosDB(refTipo, refId){
  try{ const fotos = await obtenerFotosDB(refTipo, refId); return fotos.length; }
  catch(e){ return 0; }
}

async function eliminarFotoDB(id){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, "readwrite");
    tx.objectStore(FOTOS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Re-vincula una foto ya guardada (con id temporal) a su registro definitivo,
// sin tener que volver a guardar la imagen — solo cambia a qué pertenece.
async function actualizarRefFotoDB(id, nuevoRefTipo, nuevoRefId, nuevaEtiqueta){
  const db = await abrirFotosDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FOTOS_STORE, "readwrite");
    const store = tx.objectStore(FOTOS_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) { resolve(null); return; }
      item.refTipo = nuevoRefTipo;
      item.refId = nuevoRefId;
      if (nuevaEtiqueta) item.etiqueta = nuevaEtiqueta;
      store.put(item);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Redimensiona y comprime una foto antes de guardarla (celulares suben fotos de 4-12MB)
function comprimirImagen(file, maxDim=1280, calidad=0.72){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo no es una imagen válida"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height*maxDim/width); width = maxDim; }
          else { width = Math.round(width*maxDim/height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ===== Fotos "pendientes de guardar" en un formulario =====
// ANTES: vivían solo en un array en memoria y se perdían si el navegador
// recargaba la página (por ejemplo, al volver de la cámara en el celular).
// AHORA: se guardan de inmediato en el almacenamiento permanente del
// dispositivo (IndexedDB), con un identificador temporal fijo por
// formulario. Cuando el formulario se guarda de verdad, esas fotos se
// "revinculan" al registro real — no hace falta volver a guardarlas.
const REF_TEMP = {
  rel: { tipo: "relevamiento_temp", id: "actual" },
  fin: { tipo: "obra_temp", id: "actual" },
};

async function manejarSeleccionFotos(inputEl, bufferKey, previewContId){
  const files = Array.from(inputEl.files||[]);
  if (!files.length) return;
  const ref = REF_TEMP[bufferKey];
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try{
      const dataURL = await comprimirImagen(f);
      if (ref) await guardarFotoDB(ref.tipo, ref.id, dataURL, "pendiente");
    }catch(e){ console.error(e); }
  }
  inputEl.value = "";
  await renderMiniaturasPendientes(bufferKey, previewContId);
}

async function renderMiniaturasPendientes(bufferKey, contId){
  const cont = get(contId); if (!cont) return;
  const ref = REF_TEMP[bufferKey];
  let arr = [];
  if (ref) { try{ arr = await obtenerFotosDB(ref.tipo, ref.id); }catch(e){ arr = []; } }
  if (!arr.length){ cont.innerHTML=""; cont.style.display="none"; return; }
  cont.style.display="flex";
  cont.innerHTML = arr.map((item,i)=>`
    <div class="foto-mini">
      <img src="${item.dataURL}" onclick="verFotoUnica('${bufferKey}',${i})">
      <button type="button" class="foto-mini-x" onclick="quitarFotoPendiente('${bufferKey}',${i},'${contId}')">✕</button>
    </div>`).join("");
}

async function quitarFotoPendiente(bufferKey, idx, contId){
  const ref = REF_TEMP[bufferKey];
  if (ref) {
    const arr = await obtenerFotosDB(ref.tipo, ref.id);
    const foto = arr[idx];
    if (foto) await eliminarFotoDB(foto.id);
  }
  await renderMiniaturasPendientes(bufferKey, contId);
}

async function limpiarFotosPendientes(bufferKey, contId){
  const ref = REF_TEMP[bufferKey];
  if (ref) {
    const arr = await obtenerFotosDB(ref.tipo, ref.id);
    for (const foto of arr) await eliminarFotoDB(foto.id);
  }
  const cont = get(contId); if (cont){ cont.innerHTML=""; cont.style.display="none"; }
}

// Revincula las fotos ya guardadas (con el ID temporal) al registro recién
// guardado (refId real) — no las vuelve a insertar, ya estaban guardadas.
async function confirmarFotosPendientes(bufferKey, refTipo, refId, etiqueta){
  const ref = REF_TEMP[bufferKey];
  if (!ref) return;
  try{
    const arr = await obtenerFotosDB(ref.tipo, ref.id);
    for (const foto of arr) {
      await actualizarRefFotoDB(foto.id, refTipo, refId, etiqueta);
    }
  }catch(e){
    console.error("No se pudieron vincular las fotos al registro:", e);
    if (typeof toast==="function") toast("El registro se guardó, pero hubo un problema al vincular las fotos","yellow");
  }
}

async function verFotoUnica(bufferKey, idx){
  const ref = REF_TEMP[bufferKey];
  if (!ref) return;
  const arr = await obtenerFotosDB(ref.tipo, ref.id);
  const foto = arr[idx];
  if (!foto) return;
  abrirLightbox([{dataURL:foto.dataURL}], 0, "Vista previa");
}

// ===== FIRMA DIGITAL (canvas táctil, para conformidad del cliente al finalizar obra) =====
const _firmaDibujada = {};

function initFirmaCanvas(canvasId){
  const canvas = get(canvasId); if (!canvas) return;
  // Ajusta resolución interna al tamaño real en pantalla (evita firma borrosa/desalineada)
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = 150 * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  _firmaDibujada[canvasId] = false;

  let dibujando = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  };
  const iniciar = (e) => { dibujando = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
  const mover = (e) => {
    if (!dibujando) return;
    const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    _firmaDibujada[canvasId] = true; e.preventDefault();
  };
  const terminar = () => { dibujando = false; };

  canvas.addEventListener("mousedown", iniciar);
  canvas.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", terminar);
  canvas.addEventListener("touchstart", iniciar, { passive:false });
  canvas.addEventListener("touchmove", mover, { passive:false });
  canvas.addEventListener("touchend", terminar);
}

function limpiarFirma(canvasId){
  const canvas = get(canvasId); if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
  _firmaDibujada[canvasId] = false;
}

function firmaEstaVacia(canvasId){ return !_firmaDibujada[canvasId]; }

function obtenerFirmaDataURL(canvasId){
  const canvas = get(canvasId); if (!canvas || firmaEstaVacia(canvasId)) return null;
  return canvas.toDataURL("image/png");
}

async function pintarBotonesFotos(refTipo, ids, idPrefix){
  for (const id of ids){
    const n = await contarFotosDB(refTipo, id);
    const el = get(idPrefix+id);
    if (el) el.textContent = n>0 ? `📷 ${n}` : "📷 +";
  }
}

// ===== Galería guardada (IndexedDB) con lightbox =====
async function verGaleria(refTipo, refId, titulo){
  let fotos=[];
  try{ fotos = await obtenerFotosDB(refTipo, refId); }
  catch(e){ toast("No se pudo acceder al almacenamiento de fotos en este navegador","red"); return; }
  if (!fotos.length){ toast("Todavía no hay fotos cargadas","yellow"); return; }
  abrirLightbox(fotos, 0, titulo, refTipo, refId);
}

function abrirLightbox(fotos, idx, titulo, refTipo, refId){
  document.querySelectorAll(".lb-overlay").forEach(e=>e.remove());
  const overlay = document.createElement("div");
  overlay.className = "lb-overlay";
  overlay.innerHTML = `
    <div class="lb-top">
      <span>${escapeHtml(titulo||"Fotos")} (<span id="lb-pos">${idx+1}</span>/${fotos.length})</span>
      <button class="lb-close" onclick="this.closest('.lb-overlay').remove()">✕</button>
    </div>
    <div class="lb-body">
      <button class="lb-nav lb-prev" onclick="lbMover(-1)">‹</button>
      <img id="lb-img" src="${fotos[idx].dataURL}">
      <button class="lb-nav lb-next" onclick="lbMover(1)">›</button>
    </div>
    ${refTipo?`<div class="lb-bottom"><button class="btn btn-red btn-sm" onclick="lbEliminarActual('${refTipo}','${refId}')">🗑 Eliminar esta foto</button></div>`:""}
  `;
  overlay._fotos = fotos; overlay._idx = idx;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e=>{ if(e.target===overlay) overlay.remove(); });
}
function lbMover(delta){
  const overlay = document.querySelector(".lb-overlay"); if (!overlay) return;
  overlay._idx = (overlay._idx + delta + overlay._fotos.length) % overlay._fotos.length;
  get("lb-img").src = overlay._fotos[overlay._idx].dataURL;
  get("lb-pos").textContent = overlay._idx+1;
}
async function lbEliminarActual(refTipo, refId){
  const overlay = document.querySelector(".lb-overlay"); if (!overlay) return;
  const foto = overlay._fotos[overlay._idx];
  if (!confirm("¿Eliminar esta foto? No se puede deshacer.")) return;
  await eliminarFotoDB(foto.id);
  overlay.remove();
  toast("Foto eliminada");
  // refresca contadores visibles si corresponde
  if (refTipo==="relevamiento" && typeof mostrarRelevamientos==="function") mostrarRelevamientos();
  if (refTipo==="obra" && typeof mostrarObras==="function") mostrarObras();
}
