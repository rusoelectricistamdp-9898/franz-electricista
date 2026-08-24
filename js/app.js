/* ============================================
   FRANZ ELECTRICIDAD PRO — APP.JS COMPLETO
   v2.0 · 2026 · Mar del Plata
============================================ */
const fmt = n => "$" + Math.round(n||0).toLocaleString("es-AR");
const hoy = () => new Date().toLocaleDateString("es-AR");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);

// ===== Seguridad: evita XSS al insertar texto/URLs de usuarios en innerHTML =====
function escapeHtml(str){
  if(str===null||str===undefined) return "";
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function safeImgUrl(url){
  if(!url) return "";
  try{
    const u = new URL(url, location.href);
    if(u.protocol!=="https:" && u.protocol!=="http:") return "";
    return u.href;
  }catch(e){ return ""; }
}
function get(id){ return document.getElementById(id); }
function val(id){ const e=get(id); return e?e.value.trim():""; }

function toast(msg, tipo="verde"){
  const t=document.createElement("div");
  t.style.cssText=`position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 20px;
    border-radius:10px;font-size:.85rem;font-weight:700;background:var(--bg2);
    border:1px solid var(--${tipo});color:var(--${tipo});box-shadow:0 4px 16px rgba(0,0,0,.4)`;
  t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2800);
}

// NAV
function ir(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".menu-btn").forEach(b=>b.classList.remove("active"));
  const pg=get("pg-"+id); if(pg) pg.classList.add("active");
  document.querySelectorAll(".menu-btn").forEach(b=>{
    if(b.getAttribute("onclick")?.includes(`'${id}'`)) b.classList.add("active");
  });
  if(window.innerWidth<=768) sbClose();
  const fn={dashboard:actualizarDashboard,clientes:mostrarClientes,obras:mostrarObras,
    materiales:mostrarMateriales,componentes:mostrarComponentes,tableros:mostrarTableros,
    presupuestos:mostrarPresupuestos,facturas:mostrarFacturas,relevamiento:mostrarRelevamientos,
    omisiones:mostrarOmisiones,compras:mostrarCompras,historial:mostrarHistorial};
  if(fn[id]) fn[id]();
}

// SIDEBAR
function sbToggle(){
  get("sidebar").classList.toggle("mob-open");
  get("sbOv").classList.toggle("on");
  get("hb").innerHTML=get("sidebar").classList.contains("mob-open")?"&#x2715;":"&#9776;";
}
function sbClose(){
  get("sidebar")?.classList.remove("mob-open");
  get("sbOv")?.classList.remove("on");
  const hb=get("hb"); if(hb) hb.innerHTML="&#9776;";
}
document.addEventListener("keydown",e=>{ if(e.key==="Escape") sbClose(); });

// TEMA
function cambiarTema(tema){
  const temas={
    default:{"--bg":"#0a0f1a","--bg2":"#111827","--bg3":"#1e293b","--verde":"#22c55e"},
    industrial:{"--bg":"#111111","--bg2":"#1a1a1a","--bg3":"#222222","--verde":"#ff6600"},
    electrico:{"--bg":"#07101e","--bg2":"#0b1628","--bg3":"#111f35","--verde":"#00d4ff"},
  };
  const t=temas[tema]||temas.default;
  Object.entries(t).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  localStorage.setItem("franz-tema",tema);
}

// DB LOCAL
let DB={
  clientes:     JSON.parse(localStorage.getItem("franz-clientes"))     ||[],
  obras:        JSON.parse(localStorage.getItem("franz-obras"))        ||[],
  materiales:   JSON.parse(localStorage.getItem("franz-materiales"))   ||[],
  componentes:  JSON.parse(localStorage.getItem("franz-componentes"))  ||[],
  tableros:     JSON.parse(localStorage.getItem("franz-tableros"))     ||[],
  presupuestos: JSON.parse(localStorage.getItem("franz-presupuestos")) ||[],
  relevamientos:JSON.parse(localStorage.getItem("franz-relevamientos"))||[],
  omisiones:    JSON.parse(localStorage.getItem("franz-omisiones"))    ||[],
  compras:      JSON.parse(localStorage.getItem("franz-compras"))      ||[],
  facturas:     JSON.parse(localStorage.getItem("franz-facturas"))     ||[],
};
function guardarDB(k){
  localStorage.setItem("franz-"+k,JSON.stringify(DB[k]));
  if(typeof syncPush==="function") syncPush(k);
}

// ══════════════════════════════════════
// PLAN GRATIS vs PRO — cuota de prueba (3 de cada cosa)
// ══════════════════════════════════════
const LIMITE_GRATIS = 3;
const TABLAS_CON_LIMITE = ["clientes","obras","presupuestos","facturas"];

function esPro(){
  return typeof licenciaActual!=="undefined" && licenciaActual?.plan==="pro" && licenciaActual?.activo;
}
function limiteAlcanzado(tabla){
  if(esPro()) return false;
  return DB[tabla].length >= LIMITE_GRATIS;
}
function bloquearPorLimite(tabla, etiqueta){
  toast(`Llegaste al límite de ${LIMITE_GRATIS} ${etiqueta} del plan gratis`,"yellow");
  if(typeof mostrarModalUpgrade==="function") mostrarModalUpgrade();
}
function textoContadorPlan(tabla){
  const n = DB[tabla].length;
  if(esPro()) return String(n);
  return `${Math.min(n,LIMITE_GRATIS)}/${LIMITE_GRATIS}`;
}

// DASHBOARD
function actualizarDashboard(){
  const s={"st-clientes":DB.clientes.length,"st-obras":DB.obras.length,
    "st-presupuestos":DB.presupuestos.length,"st-materiales":DB.materiales.length,
    "st-tableros":DB.tableros.length,
    "st-facturacion":fmt(DB.presupuestos.reduce((s,p)=>s+(p.total||0),0))};
  Object.entries(s).forEach(([id,v])=>{const e=get(id);if(e)e.textContent=v;});
}

// CLIENTES
function guardarCliente(){
  if(limiteAlcanzado("clientes")){ bloquearPorLimite("clientes","clientes"); return; }
  const nombre=val("cl-nombre");
  if(!nombre){toast("El nombre es obligatorio","red");return;}
  DB.clientes.push({id:uid(),nombre,tel:val("cl-tel"),dir:val("cl-dir"),
    email:val("cl-email"),obs:val("cl-obs"),fecha:hoy()});
  guardarDB("clientes");
  ["cl-nombre","cl-tel","cl-dir","cl-email","cl-obs"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarClientes(); actualizarDashboard(); sincronizarSelectClientes();
  toast("Cliente guardado");
}
function eliminarCliente(id){
  if(!confirm("Eliminar cliente?")) return;
  DB.clientes=DB.clientes.filter(c=>c.id!==id);
  guardarDB("clientes"); mostrarClientes(); actualizarDashboard(); sincronizarSelectClientes();
}
function filtrarClientes(txt){
  renderClientes(DB.clientes.filter(c=>c.nombre.toLowerCase().includes(txt.toLowerCase())||(c.tel||"").includes(txt)));
}
function mostrarClientes(){ renderClientes(DB.clientes); }
function renderClientes(lista){
  const cnt=get("cl-count"); if(cnt) cnt.textContent=textoContadorPlan("clientes");
  const cont=get("lista-clientes"); if(!cont) return;
  if(!lista.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin clientes.</p>`;return;}
  cont.innerHTML=lista.map(c=>`<div class="item"><div class="item-row">
    <div><b>${c.nombre}</b><br><small>📞 ${c.tel||"—"} | 📍 ${c.dir||"—"} | 📅 ${c.fecha}</small>
    ${c.obs?`<br><small style="color:var(--muted2)">📝 ${c.obs}</small>`:""}</div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="eliminarCliente('${c.id}')">✕</button></div>
    </div></div>`).join("");
}
function sincronizarSelectClientes(){
  ["ob-cliente","tab-obra","pres-cliente","fac-cliente"].forEach(id=>{
    const sel=get(id); if(!sel) return;
    const v=sel.value;
    sel.innerHTML=`<option value="">— Seleccionar —</option>`;
    DB.clientes.forEach(c=>{sel.innerHTML+=`<option value="${c.nombre}">${c.nombre}</option>`;});
    sel.value=v;
  });
}

// OBRAS
function guardarObra(){
  if(limiteAlcanzado("obras")){ bloquearPorLimite("obras","obras"); return; }
  const cliente=val("ob-cliente"), nombre=val("ob-nombre");
  if(!cliente||!nombre){toast("Cliente y nombre son obligatorios","red");return;}
  DB.obras.push({id:uid(),cliente,nombre,dir:val("ob-dir"),tel:val("ob-tel"),
    fecha:val("ob-fecha"),estado:val("ob-estado"),prioridad:val("ob-prioridad"),
    obs:val("ob-obs"),aea:val("ob-aea"),fechaReg:hoy()});
  guardarDB("obras");
  ["ob-nombre","ob-dir","ob-tel","ob-obs","ob-aea"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarObras(); actualizarDashboard(); toast("Obra guardada");
}
async function eliminarObra(id){
  if(!confirm("Eliminar obra?")) return;
  DB.obras=DB.obras.filter(o=>o.id!==id);
  guardarDB("obras"); mostrarObras(); actualizarDashboard();
  const fotos=await obtenerFotosDB("obra",id);
  for(const f of fotos) await eliminarFotoDB(f.id);
  const firmas=await obtenerFotosDB("obra_firma",id);
  for(const f of firmas) await eliminarFotoDB(f.id);
}
function filtrarObras(txt){
  const est=val("ob-filtro-estado");
  renderObras(DB.obras.filter(o=>{
    const mT=!txt||o.nombre.toLowerCase().includes(txt.toLowerCase())||o.cliente.toLowerCase().includes(txt.toLowerCase());
    const mE=!est||o.estado===est; return mT&&mE;
  }));
}
function mostrarObras(){ renderObras(DB.obras); }
const bE=e=>{const m={Pendiente:"badge-blue","En proceso":"badge-yellow",Finalizada:"badge-green"};
  return `<span class="badge ${m[e]||"badge-cyan"}">${e||"—"}</span>`;};
const bP=p=>{const m={Normal:"badge-green",Alta:"badge-yellow",Urgente:"badge-red"};
  return `<span class="badge ${m[p]||"badge-cyan"}">${p||"—"}</span>`;};
function renderObras(lista){
  const cnt=get("ob-count"); if(cnt) cnt.textContent=textoContadorPlan("obras");
  const cont=get("lista-obras"); if(!cont) return;
  if(!lista.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin obras.</p>`;return;}
  cont.innerHTML=lista.map(o=>`<div class="item"><div class="item-row">
    <div><b>${escapeHtml(o.nombre)}</b> ${bE(o.estado)} ${bP(o.prioridad)}<br>
    <small>👤 ${escapeHtml(o.cliente)} | 📍 ${escapeHtml(o.dir)||"—"} | 📅 ${o.fecha||o.fechaReg}</small>
    ${o.obs?`<br><small style="color:var(--muted2)">📝 ${escapeHtml(o.obs)}</small>`:""}
    ${o.notasFinal?`<br><small style="color:var(--verde)">✅ Cierre: ${escapeHtml(o.notasFinal)}</small>`:""}
    </div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm btn-foto-galeria" id="ob-fotobtn-${o.id}" onclick="verGaleria('obra','${o.id}','Evidencia — ${escapeHtml(o.nombre)}')">📷…</button>
      ${o.tieneFirma?`<button class="btn btn-outline btn-sm" onclick="verGaleria('obra_firma','${o.id}','Firma de ${escapeHtml(o.firmante)||'conformidad'}')">🖊️</button>`:""}
      <button class="btn btn-verde btn-sm" onclick="abrirFinalizarObra('${o.id}')">✅ Finalizar</button>
      <button class="btn btn-red btn-sm" onclick="eliminarObra('${o.id}')">✕</button>
    </div>
    </div></div>`).join("");
  pintarBotonesFotos("obra", lista.map(o=>o.id), "ob-fotobtn-");
}

function abrirFinalizarObra(id){
  const o=DB.obras.find(x=>x.id===id); if(!o) return;
  limpiarFotosPendientes("fin","fin-fotos-preview");
  const modal=document.createElement("div");
  modal.className="modal-overlay";
  modal.innerHTML=`
    <div class="modal-box">
      <h3 style="margin-bottom:4px">✅ Finalizar obra</h3>
      <p style="color:var(--muted2);font-size:.82rem;margin-bottom:14px">${escapeHtml(o.nombre)} — ${escapeHtml(o.cliente)}</p>
      <div class="fld">
        <label>Materiales utilizados / modificaciones realizadas</label>
        <textarea id="fin-notas" placeholder="Ej: se instaló tablero 12 módulos, diferencial 40A 30mA, cambio de cable a 4mm² en circuito de cocina...">${escapeHtml(o.notasFinal)||""}</textarea>
      </div>
      <div class="fld">
        <label>📷 Fotos como comprobante</label>
        <div class="foto-picker">
          <label class="btn btn-outline btn-sm" style="cursor:pointer">
            📷 Tomar / subir foto
            <input type="file" accept="image/*" capture="environment" multiple style="display:none"
              onchange="manejarSeleccionFotos(this,'fin','fin-fotos-preview')">
          </label>
          <small style="color:var(--muted2)">Materiales colocados, estado final, etc.</small>
        </div>
        <div id="fin-fotos-preview" class="foto-mini-grid"></div>
      </div>
      <div class="fld">
        <label>🖊️ Firma de conformidad del cliente (opcional)</label>
        <canvas id="fin-firma-canvas" style="width:100%;height:150px;border:1px solid var(--border);border-radius:8px;touch-action:none;display:block"></canvas>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
          <input type="text" id="fin-firma-nombre" placeholder="Nombre y DNI de quien firma" style="flex:1">
          <button type="button" class="btn btn-outline btn-sm" onclick="limpiarFirma('fin-firma-canvas')">Borrar</button>
        </div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn btn-verde" onclick="guardarFinalizacionObra('${id}')">💾 Confirmar finalización</button>
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  initFirmaCanvas("fin-firma-canvas");
  modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });
}
async function guardarFinalizacionObra(id){
  const o=DB.obras.find(x=>x.id===id); if(!o) return;
  o.estado="Finalizada";
  o.notasFinal=val("fin-notas");
  o.fechaFin=hoy();
  const firmaURL=typeof obtenerFirmaDataURL==="function"?obtenerFirmaDataURL("fin-firma-canvas"):null;
  if(firmaURL){
    o.firmante=val("fin-firma-nombre");
    o.tieneFirma=true;
    try{ await guardarFotoDB("obra_firma", id, firmaURL, "firma"); }catch(e){ console.error(e); }
  }
  guardarDB("obras");
  await confirmarFotosPendientes("fin","obra",id,"finalizacion");
  limpiarFotosPendientes("fin","fin-fotos-preview");
  document.querySelector(".modal-overlay")?.remove();
  mostrarObras(); actualizarDashboard();
  toast("Obra finalizada con evidencia guardada");
}

// MATERIALES — buscador tipo ML
function guardarMaterial(){
  const nombre=val("mat-nombre");
  if(!nombre){toast("Nombre obligatorio","red");return;}
  DB.materiales.push({id:uid(),nombre,categoria:val("mat-categoria"),marca:val("mat-marca"),
    modelo:val("mat-modelo"),caract:val("mat-caract"),proveedor:val("mat-prov"),obs:val("mat-obs"),fecha:hoy()});
  guardarDB("materiales");
  ["mat-nombre","mat-marca","mat-modelo","mat-caract","mat-prov","mat-obs"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarMateriales(); actualizarDashboard(); toast("Material guardado");
}
function eliminarMaterial(id){
  if(!confirm("Eliminar material?")) return;
  DB.materiales=DB.materiales.filter(m=>m.id!==id);
  guardarDB("materiales"); mostrarMateriales(); actualizarDashboard();
}
function buscarMateriales(txt){
  const res=get("mat-resultados"); if(!res) return;
  if(!txt||txt.length<2){res.classList.remove("visible");return;}
  const f=DB.materiales.filter(m=>m.nombre.toLowerCase().includes(txt.toLowerCase())||
    (m.marca||"").toLowerCase().includes(txt.toLowerCase())||
    (m.categoria||"").toLowerCase().includes(txt.toLowerCase())).slice(0,12);
  if(!f.length){res.innerHTML=`<div class="br-item"><small style="color:var(--muted)">Sin resultados</small></div>`;res.classList.add("visible");return;}
  res.innerHTML=f.map(m=>`<div class="br-item" onclick="seleccionarMaterial('${m.id}')">
    <b>${m.nombre}</b><small>${m.categoria} · ${m.marca||"—"}</small></div>`).join("");
  res.classList.add("visible");
}
function seleccionarMaterial(id){
  const m=DB.materiales.find(x=>x.id===id); if(!m) return;
  get("mat-resultados").classList.remove("visible");
  get("mat-buscar").value=m.nombre;
  mostrarMateriales(m.nombre);
}
document.addEventListener("click",e=>{if(!e.target.closest(".buscador-wrap"))get("mat-resultados")?.classList.remove("visible");});
function mostrarMateriales(filtro=""){
  const cats=[...new Set(DB.materiales.map(m=>m.categoria))];
  const tabsEl=get("mat-tabs");
  if(tabsEl){
    tabsEl.innerHTML=`<div class="tab on" onclick="filtrarMatCat(this,'')">Todos</div>`+
      cats.map(c=>`<div class="tab" onclick="filtrarMatCat(this,'${c}')">${c}</div>`).join("");
  }
  renderMateriales(filtro?DB.materiales.filter(m=>m.nombre.toLowerCase().includes(filtro.toLowerCase())):DB.materiales);
}
function filtrarMatCat(el,cat){
  document.querySelectorAll("#mat-tabs .tab").forEach(t=>t.classList.remove("on"));
  el.classList.add("on");
  renderMateriales(cat?DB.materiales.filter(m=>m.categoria===cat):DB.materiales);
}
let matPagLista=[]; let matPagShown=0; const MAT_PAG_SIZE=150;
function renderMateriales(lista){
  const cnt=get("mat-count"); if(cnt) cnt.textContent=DB.materiales.length;
  matPagLista=lista; matPagShown=0;
  const cont=get("lista-materiales"); if(!cont) return;
  if(!lista.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin materiales.</p>`;return;}
  cont.innerHTML="";
  renderMasMateriales();
}
const CATEGORIAS_GRATIS = ["Cables","Canalización","Cajas"];
function materialItemHTML(m){
  const bloqueado = !esPro() && !CATEGORIAS_GRATIS.includes(m.categoria);
  if(bloqueado){
    return `<div class="item item-bloqueado" onclick="mostrarModalUpgrade()">
      <div class="item-row">
        <div><b>${m.nombre}</b> <span class="badge badge-cyan">${m.categoria}</span> 🔒<br>
        <small>Disponible en el plan Pro</small></div>
        <div class="item-actions"><span class="btn btn-outline btn-sm" style="opacity:.5">🔒</span></div>
      </div></div>`;
  }
  return `<div class="item"><div class="item-row">
    <div><b>${m.nombre}</b> <span class="badge badge-cyan">${m.categoria}</span><br>
    <small>🏭 ${m.marca||"—"} ${m.modelo?("· "+m.modelo):""} ${m.caract?("· "+m.caract):""}</small>
    ${m.proveedor?`<br><small style="color:var(--muted2)">🚚 ${m.proveedor}</small>`:""}</div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm" onclick="agregarMaterialACompra('${m.id}')">🛒</button>
      <button class="btn btn-outline btn-sm" onclick="agregarMaterialAPres('${m.id}')">📋</button>
      <button class="btn btn-red btn-sm" onclick="eliminarMaterial('${m.id}')">✕</button>
    </div></div></div>`;
}
function renderMasMateriales(){
  const cont=get("lista-materiales"); if(!cont) return;
  const viejoBtn=get("mat-mas-btn"); if(viejoBtn) viejoBtn.remove();
  const tanda=matPagLista.slice(matPagShown, matPagShown+MAT_PAG_SIZE);
  cont.insertAdjacentHTML("beforeend", tanda.map(materialItemHTML).join(""));
  matPagShown+=tanda.length;
  if(matPagShown<matPagLista.length){
    const btn=document.createElement("button");
    btn.id="mat-mas-btn"; btn.className="btn btn-outline btn-full";
    btn.style.marginTop="10px";
    btn.textContent=`⬇ Mostrar más (${matPagLista.length-matPagShown} restantes)`;
    btn.onclick=renderMasMateriales;
    cont.appendChild(btn);
  }
}
function agregarMaterialACompra(id){
  const m=DB.materiales.find(x=>x.id===id); if(!m) return;
  const cant=parseInt(prompt("Cantidad de "+m.nombre+":"))||1;
  DB.compras.push({id:uid(),nombre:m.nombre,cant,prov:m.proveedor||"",fecha:hoy()});
  guardarDB("compras"); toast(m.nombre+" agregado a compras");
}
function agregarMaterialAPres(id){
  const m=DB.materiales.find(x=>x.id===id); if(!m) return;
  const cant=parseInt(prompt("Cantidad:"))||1;
  const precio=parseFloat(prompt("Precio unitario ($):")||"0")||0;
  presItemsActual.push({nombre:m.nombre,cant,precio});
  renderPresItems(); ir("presupuestos"); toast(m.nombre+" agregado al presupuesto");
}

// COMPONENTES
function guardarComponente(){
  const nombre=val("comp-nombre");
  if(!nombre){toast("Nombre obligatorio","red");return;}
  DB.componentes.push({id:uid(),nombre,cat:val("comp-cat"),subcat:val("comp-subcat"),
    marca:val("comp-marca"),modelo:val("comp-modelo"),amp:val("comp-amp"),
    polos:val("comp-polos"),norma:val("comp-norma"),obs:val("comp-obs"),fecha:hoy()});
  guardarDB("componentes");
  ["comp-nombre","comp-subcat","comp-marca","comp-modelo","comp-amp","comp-norma","comp-obs"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarComponentes(); toast("Componente guardado");
}
function eliminarComponente(id){
  if(!confirm("Eliminar?")) return;
  DB.componentes=DB.componentes.filter(c=>c.id!==id);
  guardarDB("componentes"); mostrarComponentes();
}
function filtrarComponentes(txt){
  const cat=val("comp-filtro-cat");
  renderComponentes(DB.componentes.filter(c=>{
    const mT=!txt||c.nombre.toLowerCase().includes(txt.toLowerCase())||(c.marca||"").toLowerCase().includes(txt.toLowerCase());
    const mC=!cat||c.cat===cat; return mT&&mC;
  }));
}
function mostrarComponentes(){ renderComponentes(DB.componentes); }
function renderComponentes(lista){
  const cnt=get("comp-count"); if(cnt) cnt.textContent=DB.componentes.length;
  const cont=get("lista-componentes"); if(!cont) return;
  if(!lista.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin componentes.</p>`;return;}
  cont.innerHTML=lista.map(c=>`<div class="item"><div class="item-row">
    <div><b>${c.nombre}</b> <span class="badge badge-blue">${c.cat}</span><br>
    <small>${c.marca||"—"} · ${c.modelo||""} · ${c.amp||""} · ${c.polos||""}</small>
    ${c.norma?`<br><small style="color:var(--muted2)">📋 ${c.norma}</small>`:""}</div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm" onclick="agregarComponenteAPres('${c.id}')">📋</button>
      <button class="btn btn-red btn-sm" onclick="eliminarComponente('${c.id}')">✕</button>
    </div>
    </div></div>`).join("");
}
function agregarComponenteAPres(id){
  const c=DB.componentes.find(x=>x.id===id); if(!c) return;
  const cant=parseInt(prompt("Cantidad:"))||1;
  const precio=parseFloat(prompt("Precio unitario ($):")||"0")||0;
  presComponentesActual.push({nombre:c.nombre,cant,precio});
  renderPresComponentes(); ir("presupuestos"); toast(c.nombre+" agregado al presupuesto");
}

// PLANTILLAS
const ACTIVIDADES=[
  {id:"canalizacion",ico:"🔧",nombre:"Canalización",mats:["Caño PVC rígido 20mm (barra 3m)","Caño PVC rígido 25mm (barra 3m)","Caño PVC corrugado flexible Semipesado 20mm (rollo 25m)","Conector recto PVC 20mm","Conector recto PVC 25mm","Unión PVC 20mm","Curva 90° PVC 20mm","Curva 90° PVC 25mm","Abrazadera metálica 20mm","Abrazadera plástica 20mm","Caja PVC Rectangular 5x10 embutir","Caja PVC Octogonal chica embutir","Caja PVC Cuadrada 10x10 embutir","Tapa registro PVC 20mm","Taco Fisher S6 (bolsa x100)","Tornillo autoperforante 6x50mm (bolsa x100)","Sellador elástico poliuretánico (pomo)","Canaleta plástica 20x12mm con tapa (barra 2m)","Broca widia 6mm","Broca widia 8mm"]},
  {id:"cableado",ico:"⚡",nombre:"Cableado",mats:["Cable unipolar IRAM 247-3 1,5mm² Negro","Cable unipolar IRAM 247-3 1,5mm² Celeste","Cable unipolar IRAM 247-3 1,5mm² Verde/Amarillo","Cable unipolar IRAM 247-3 2,5mm² Negro","Cable unipolar IRAM 247-3 2,5mm² Celeste","Cable unipolar IRAM 247-3 2,5mm² Verde/Amarillo","Cable unipolar IRAM 247-3 4mm² Negro","Cable unipolar IRAM 247-3 4mm² Celeste","Wago 3 entradas 2,5mm² (blister)","Wago 5 entradas 2,5mm² (blister)","Capuchón de empalme azul (bolsa x100)","Cinta aisladora 3M Scotch 33 (rollo)","Terminal tubular 1,5mm²","Terminal tubular 2,5mm²","Precinto plástico 15cm (bolsa x100)","Etiqueta identificadora de cables (rollo)"]},
  {id:"tablero_mono",ico:"📦",nombre:"Tablero monofásico",mats:["Gabinete DIN 12 módulos embutir","Interruptor diferencial 2P 40A 30mA","Interruptor termomagnético 1P 16A curva C","Interruptor termomagnético 1P 20A curva C","Interruptor termomagnético 1P 10A curva C","Descargador de sobretensión (DPS) tipo 2 4P","Riel DIN 35mm (barra 2m)","Peine unifilar 6 módulos","Barra de neutros 10 posiciones","Cable unipolar IRAM 247-3 2,5mm² Negro","Cable unipolar IRAM 247-3 2,5mm² Celeste","Cable unipolar IRAM 247-3 2,5mm² Verde/Amarillo","Terminal tubular 2,5mm²","Bornera de paso 2,5mm² (unidad)","Canaleta ranurada para tablero 40x40mm (2m)"]},
  {id:"tablero_tri",ico:"⚡⚡",nombre:"Tablero trifásico",mats:["Gabinete DIN 24 módulos embutir","Interruptor diferencial 4P 63A 30mA","Interruptor termomagnético 2P 25A curva C","Interruptor termomagnético 3P 25A curva C","Interruptor termomagnético 3P 32A curva C","Descargador de sobretensión (DPS) tipo 1+2 4P","Riel DIN 35mm (barra 2m)","Peine trifásico 6 módulos","Barra de neutros 20 posiciones","Cable unipolar IRAM 247-3 6mm² Negro","Cable unipolar IRAM 247-3 6mm² Celeste","Cable unipolar IRAM 247-3 6mm² Verde/Amarillo","Terminal tubular 6mm²","Voltímetro digital de tablero 96x96","Amperímetro digital de tablero 96x96","Transformador de corriente (TI) 100/5A"]},
  {id:"pat",ico:"🌎",nombre:"Puesta a tierra",mats:["Jabalina copperweld 1,5m 5/8\"","Caja de inspección PAT 20x20cm con tapa","Grampa jabalina bronce 5/8\"","Cable desnudo cobre 16mm² (PAT)","Barra equipotencial de cobre 12 bornes","Gel conductor para jabalina","Soldadura exotérmica cartucho 90g","Bentonita conductiva (bolsa 5kg)","Cinta aisladora 3M Scotch 33 (rollo)","Conector bimetálico Cu/Al"]},
  {id:"iluminacion",ico:"💡",nombre:"Iluminación",mats:["Caja PVC Octogonal chica embutir","Caja PVC Octogonal grande embutir","Cable unipolar IRAM 247-3 1,5mm² Negro","Cable unipolar IRAM 247-3 1,5mm² Celeste","Cable unipolar IRAM 247-3 1,5mm² Verde/Amarillo","Llave simple 1 punto","Bastidor Mignón 5x5 (1 módulo)","Tapa mignón 1 módulo","Llave combinación 2 puntos","Bastidor 5x10 (2 módulos)","Tapa 2 módulos","Panel LED embutir redondo 12W","Panel LED embutir redondo 18W","Aplique LED pared exterior 12W IP65","Sensor de movimiento PIR embutir","Sensor de movimiento PIR de pared","Sensor crepuscular fotocélula","Wago 3 entradas 2,5mm² (blister)","Cinta aisladora 3M Scotch 33 (rollo)"]},
  {id:"tomas",ico:"🔌",nombre:"Tomas y llaves",mats:["Caja PVC Rectangular 5x10 embutir","Caja PVC Rectangular 5x10 exterior (a la vista)","Toma 2P+T 10A embutir","Toma 2P+T 20A embutir","Bastidor 5x10 (2 módulos)","Tapa 2 módulos","Tapa y bastidor intemperie 4 módulos IP55","Cable unipolar IRAM 247-3 2,5mm² Negro","Cable unipolar IRAM 247-3 2,5mm² Celeste","Cable unipolar IRAM 247-3 2,5mm² Verde/Amarillo","Wago 3 entradas 2,5mm² (blister)","Toma USB doble embutir","Cinta aisladora 3M Scotch 33 (rollo)"]},
  {id:"acometida",ico:"🏗",nombre:"Acometida / pilar",mats:["Caja de medición monofásica (para pilar)","Caja de inspección PAT 30x30cm con tapa","Caño PVC rígido 50mm (barra 3m)","Conector recto PVC 50mm","Jabalina copperweld 1,5m 5/8\"","Grampa jabalina bronce 5/8\"","Cable unipolar IRAM 247-3 10mm² Negro","Cable unipolar IRAM 247-3 10mm² Celeste","Cable desnudo cobre 16mm² (PAT)","Base portafusible NH tamaño 00 tripolar","Fusible NH tamaño 00 25A","Cinta aisladora 3M Scotch 33 (rollo)"]},
  {id:"refrigeracion",ico:"❄",nombre:"Refrigeración",mats:["Contactor 9A 220V para compresor","Relé térmico 4-6A para compresor","Termostato digital PID cámara fría","Sonda de temperatura NTC para termostato digital","Temporizador de descongelamiento electromecánico","Resistencia de descongelamiento para evaporador","Capacitor de marcha 30µF 440V","Capacitor de arranque 200µF 250V","Protector térmico Klixon compresor","Presostato de alta y baja combinado","Válvula solenoide refrigeración 220V","Caja estanca IP65 2 bocas","Toma estanca IP66 2P+T 10A exterior","Cable flexible 3x2,5mm² p/AC (m)","Canalización flexible armada para AC 1/2\" (m)"]},
  {id:"hvac",ico:"🌡",nombre:"Aire acondicionado",mats:["Placa control aire acondicionado split 9000BTU (genérica)","Capacitor para motor de aire acondicionado 35µF","Contactor para condensadora AC 25A","Interruptor termomagnético 1P 16A curva C","Interruptor seccionador de corte para AC (caja estanca)","Termostato de ambiente digital","Sensor de temperatura NTC para AC","Cable flexible 3x2,5mm² p/AC (m)","Cable tipo taller multiconductor 4x1,5mm² p/interconexión AC (m)","Canalización flexible armada para AC 1/2\" (m)","Soporte de pared para condensadora AC","Base antivibratoria para condensadora AC"]},
  {id:"automatizacion",ico:"🤖",nombre:"Automatización industrial",mats:["PLC compacto 24 I/O 220V","HMI táctil 7\"","Contactor tripolar 18A bobina 220V","Relé auxiliar 24V 4 contactos","Zócalo para relé auxiliar 11 pines","Sensor inductivo M12 NO","Pulsador plástico verde NA 22mm","Seta de emergencia NC 22mm","Fuente switching 24V 5A DIN","Bornera de paso 2,5mm² (unidad)","Terminal tubular 2,5mm²","Canaleta ranurada industrial 60x60mm (2m)"]},
  {id:"domotica",ico:"🏠",nombre:"Domótica",mats:["Relé inteligente WiFi para luces 1 canal","Interruptor táctil domótico WiFi 1 punto","Toma inteligente WiFi 10A","Central domótica (hub) Zigbee/WiFi","Sensor de puerta/ventana Zigbee","Sensor de movimiento Zigbee","Cerradura inteligente WiFi","Cortina motorizada control WiFi","Termostato inteligente WiFi"]},
  {id:"solar",ico:"☀",nombre:"Energía solar",mats:["Panel solar monocristalino 450W","Inversor on-grid 5kW monofásico","Controlador de carga MPPT 60A","Descargador de sobretensión (DPS) DC 1000V","Conector MC4 macho/hembra (par)","Cable solar 6mm² rojo (1500Vdc)","Cable solar 6mm² negro (1500Vdc)","Interruptor diferencial tipo B 40A 30mA (solar/VFD)","Fusible NH tamaño 00 63A","Estructura de montaje techo inclinado (kit por panel)","Caja de conexiones DC (string box)","Medidor bidireccional de energía"]},
  {id:"cctv",ico:"📷",nombre:"CCTV / Seguridad",mats:["Cámara IP 2MP exterior con visión nocturna","Cámara IP 4MP domo interior","DVR/NVR 8 canales","Disco rígido para videovigilancia 1TB","Cable UTP Cat6 (rollo 305m)","Conector RJ45 Cat6 (bolsa x50)","Fuente switching 12V 5A para CCTV","Switch PoE 8 puertos","Patch cord Cat6 (unidad 3m)","Rack de pared 6U"]},
  {id:"industrial_motor",ico:"⚙",nombre:"Arranque de motores",mats:["Contactor tripolar 25A bobina 220V","Relé térmico regulable 9-13A","Guardamotor regulable 9-13A","Variador de frecuencia 2HP","Pulsador plástico verde NA 22mm","Pulsador plástico rojo NA 22mm","Seta de emergencia NC 22mm","Selector de 2 posiciones 22mm","Bornera enchufable 3 polos","Cable unipolar IRAM 247-3 4mm² Negro"]},
  {id:"camara_frigorifica",ico:"🧊",nombre:"Cámara frigorífica",mats:["Contactor 18A 220V para compresor","Relé térmico regulable 12-18A","Termostato digital PID cámara fría","Sonda de temperatura NTC para termostato digital","Temporizador de descongelamiento electromecánico","Resistencia de descongelamiento para evaporador","Presostato de alta y baja combinado","Válvula solenoide refrigeración 220V","Resistencia de cárter compresor","Motor de ventilador evaporador 1/6HP","Gabinete DIN 12 módulos IP65 exterior","Cable unipolar IRAM 247-3 2,5mm² Negro","Cable unipolar IRAM 247-3 2,5mm² Celeste","Caja estanca IP65 4 bocas","Canalización flexible armada para AC 3/4\" (m)"]},
  {id:"porton_automatico",ico:"🚪",nombre:"Portón automático",mats:["Motor para portón corredizo","Central de control de accesos","Fotocélula de seguridad para portón (par)","Baliza luminosa 220V","Cremallera para portón corredizo (tramo 1m)","Pulsador plástico verde NA 22mm","Seta de emergencia NC 22mm","Caño PVC rígido 20mm (barra 3m)","Cable unipolar IRAM 247-3 1,5mm² Negro","Cable unipolar IRAM 247-3 1,5mm² Celeste","Interruptor termomagnético 1P 10A curva C","Jabalina copperweld 1,5m 5/8\""]},
  {id:"ascensor",ico:"🛗",nombre:"Ascensor (tablero de máquinas)",mats:["Gabinete DIN 24 módulos embutir","Interruptor diferencial 4P 40A 30mA","Interruptor termomagnético 3P 25A curva C","Contactor tripolar 32A bobina 220V","Relé térmico regulable 17-25A","PLC compacto 24 I/O 220V","Pulsador plástico rojo NA 22mm","Seta de emergencia NC 22mm","Fuente switching 24V 5A DIN","Barra de neutros 20 posiciones","Cable unipolar IRAM 247-3 4mm² Negro","Cable unipolar IRAM 247-3 4mm² Celeste","Cable unipolar IRAM 247-3 4mm² Verde/Amarillo","Terminal tubular 4mm²"]},
];

let actividadSeleccionada=null;
function iniciarPlantillas(){
  const grid=get("act-grid"); if(!grid) return;
  grid.innerHTML=ACTIVIDADES.map(a=>`<div class="act-card" id="act-${a.id}" onclick="seleccionarActividad('${a.id}')">
    <div class="act-ico">${a.ico}</div><div class="act-name">${a.nombre}</div></div>`).join("");
}
function seleccionarActividad(id){
  document.querySelectorAll(".act-card").forEach(c=>c.classList.remove("sel"));
  const el=get("act-"+id); if(el) el.classList.add("sel");
  actividadSeleccionada=ACTIVIDADES.find(a=>a.id===id); if(!actividadSeleccionada) return;
  get("act-nombre-sel").textContent=actividadSeleccionada.nombre;
  const lista=get("lista-plantilla");
  lista.innerHTML=actividadSeleccionada.mats.map((m,i)=>`<div class="item" style="display:flex;justify-content:space-between;align-items:center">
    <span><b>${m}</b></span>
    <input type="number" value="1" min="0" style="width:70px;margin:0;padding:5px 8px;font-size:.82rem" id="plt-cant-${i}">
    </div>`).join("");
  get("panel-plantilla-resultado").style.display="block";
  get("panel-plantilla-resultado").scrollIntoView({behavior:"smooth"});
}
function pasarPlantillaAPresupuesto(){
  if(!actividadSeleccionada){toast("Seleccioná una actividad","red");return;}
  actividadSeleccionada.mats.forEach((m,i)=>{
    const cant=parseInt(get("plt-cant-"+i)?.value)||1;
    if(cant>0) presItemsActual.push({nombre:m,cant,precio:0});
  });
  renderPresItems(); ir("presupuestos"); toast("Materiales pasados al presupuesto");
}
function pasarPlantillaACompras(){
  if(!actividadSeleccionada){toast("Seleccioná una actividad","red");return;}
  actividadSeleccionada.mats.forEach((m,i)=>{
    const cant=parseInt(get("plt-cant-"+i)?.value)||1;
    if(cant>0) DB.compras.push({id:uid(),nombre:m,cant,prov:"",fecha:hoy()});
  });
  guardarDB("compras"); ir("compras"); toast("Materiales agregados a compras");
}

// TABLEROS
function guardarTablero(){
  const nombre=val("tab-nombre");
  if(!nombre){toast("Nombre obligatorio","red");return;}
  DB.tableros.push({id:uid(),nombre,tipo:val("tab-tipo"),circuitos:parseInt(val("tab-circuitos"))||6,
    obra:val("tab-obra"),diferencial:val("tab-diferencial"),obs:val("tab-obs"),fecha:hoy()});
  guardarDB("tableros");
  ["tab-nombre","tab-circuitos","tab-obs"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarTableros(); actualizarDashboard(); toast("Tablero guardado");
}
function eliminarTablero(id){
  if(!confirm("Eliminar tablero?")) return;
  DB.tableros=DB.tableros.filter(t=>t.id!==id);
  guardarDB("tableros"); mostrarTableros(); actualizarDashboard();
}
function mostrarTableros(){
  const cnt=get("tab-count"); if(cnt) cnt.textContent=DB.tableros.length;
  const cont=get("lista-tableros"); if(!cont) return;
  if(!DB.tableros.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin tableros.</p>`;return;}
  cont.innerHTML=DB.tableros.map(t=>`<div class="item"><div class="item-row">
    <div><b>${t.nombre}</b> <span class="badge badge-cyan">${t.tipo}</span><br>
    <small>🔌 ${t.circuitos} circuitos | Diferencial: ${t.diferencial} | 📅 ${t.fecha}</small><br>
    <small style="color:var(--verde)">✔ Gabinete ✔ Diferencial ${t.diferencial} ✔ ${t.circuitos} térmicas ✔ Riel DIN ✔ Barra neutros+tierra</small>
    </div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="eliminarTablero('${t.id}')">✕</button></div>
    </div></div>`).join("");
}

// PRESUPUESTOS
let presItemsActual=[];
let presComponentesActual=[];
let presAdicionalesActual=[];
function agregarItemPres(){
  const nombre=val("pres-item-nombre");
  if(!nombre){toast("Ingresá el ítem","red");return;}
  const cant=parseFloat(val("pres-item-cant"))||1;
  const precio=parseFloat(val("pres-item-precio"))||0;
  const costo=parseFloat(val("pres-item-costo"))||0;
  presItemsActual.push({nombre,cant,precio,costo});
  ["pres-item-nombre","pres-item-cant","pres-item-precio","pres-item-costo"].forEach(id=>{const e=get(id);if(e)e.value="";});
  renderPresItems();
}
function quitarItemPres(i){ presItemsActual.splice(i,1); renderPresItems(); }
function renderPresItems(){
  const cont=get("pres-items"); if(!cont) return;
  if(!presItemsActual.length){cont.innerHTML=`<p style="color:var(--muted);font-size:.82rem;margin-top:8px">Sin materiales.</p>`;actualizarTotalPres();return;}
  cont.innerHTML=presItemsActual.map((item,i)=>`<div class="item"><div class="item-row">
    <div><b>${item.nombre}</b><br><small>Cant: ${item.cant} | Precio: ${fmt(item.precio)} | <b style="color:var(--verde)">Sub: ${fmt(item.cant*item.precio)}</b></small></div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="quitarItemPres(${i})">✕</button></div>
    </div></div>`).join("");
  actualizarTotalPres();
}

function agregarComponentePres(){
  const nombre=val("pres-comp-nombre");
  if(!nombre){toast("Ingresá el componente","red");return;}
  const cant=parseFloat(val("pres-comp-cant"))||1;
  const precio=parseFloat(val("pres-comp-precio"))||0;
  const costo=parseFloat(val("pres-comp-costo"))||0;
  presComponentesActual.push({nombre,cant,precio,costo});
  ["pres-comp-nombre","pres-comp-cant","pres-comp-precio","pres-comp-costo"].forEach(id=>{const e=get(id);if(e)e.value="";});
  renderPresComponentes();
}
function quitarComponentePres(i){ presComponentesActual.splice(i,1); renderPresComponentes(); }
function renderPresComponentes(){
  const cont=get("pres-componentes"); if(!cont) return;
  if(!presComponentesActual.length){cont.innerHTML=`<p style="color:var(--muted);font-size:.82rem;margin-top:8px">Sin componentes.</p>`;actualizarTotalPres();return;}
  cont.innerHTML=presComponentesActual.map((item,i)=>`<div class="item"><div class="item-row">
    <div><b>${item.nombre}</b><br><small>Cant: ${item.cant} | Precio: ${fmt(item.precio)} | <b style="color:var(--verde)">Sub: ${fmt(item.cant*item.precio)}</b></small></div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="quitarComponentePres(${i})">✕</button></div>
    </div></div>`).join("");
  actualizarTotalPres();
}

function agregarAdicionalPres(){
  const concepto=val("pres-adic-concepto");
  if(!concepto){toast("Ingresá el concepto","red");return;}
  const importe=parseFloat(val("pres-adic-importe"))||0;
  presAdicionalesActual.push({concepto,importe});
  ["pres-adic-concepto","pres-adic-importe"].forEach(id=>{const e=get(id);if(e)e.value="";});
  renderPresAdicionales();
}
function quitarAdicionalPres(i){ presAdicionalesActual.splice(i,1); renderPresAdicionales(); }
function renderPresAdicionales(){
  const cont=get("pres-adicionales"); if(!cont) return;
  if(!presAdicionalesActual.length){cont.innerHTML=`<p style="color:var(--muted);font-size:.82rem;margin-top:8px">Sin adicionales.</p>`;actualizarTotalPres();return;}
  cont.innerHTML=presAdicionalesActual.map((item,i)=>`<div class="item"><div class="item-row">
    <div><b>${item.concepto}</b> — <b style="color:var(--verde)">${fmt(item.importe)}</b></div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="quitarAdicionalPres(${i})">✕</button></div>
    </div></div>`).join("");
  actualizarTotalPres();
}

function actualizarTotalPres(){
  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);
  const total=totalMat+totalComp+mo+totalAdic;
  const cont=get("pres-total"); if(!cont) return;
  cont.innerHTML=`<div class="total-box">
    <div><div class="lbl">Materiales</div><div class="val">${fmt(totalMat)}</div></div>
    <div><div class="lbl">Componentes</div><div class="val">${fmt(totalComp)}</div></div>
    <div><div class="lbl">Mano de obra</div><div class="val">${fmt(mo)}</div></div>
    <div><div class="lbl">Adicionales</div><div class="val">${fmt(totalAdic)}</div></div>
    <div><div class="lbl">TOTAL</div><div class="val">${fmt(total)}</div></div>
    </div>`;
}
function guardarPresupuesto(){
  if(limiteAlcanzado("presupuestos")){ bloquearPorLimite("presupuestos","presupuestos"); return; }
  const cliente=val("pres-cliente");
  if(!cliente){toast("Seleccioná un cliente","red");return;}
  if(!presItemsActual.length && !presComponentesActual.length){toast("Agregá al menos un material o componente","red");return;}
  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);
  DB.presupuestos.push({
    id:uid(),cliente,obra:val("pres-obra"),
    items:[...presItemsActual],
    componentes:[...presComponentesActual],
    adicionales:[...presAdicionalesActual],
    mo,total:totalMat+totalComp+mo+totalAdic,fecha:hoy()
  });
  guardarDB("presupuestos");
  presItemsActual=[]; presComponentesActual=[]; presAdicionalesActual=[];
  renderPresItems(); renderPresComponentes(); renderPresAdicionales();
  const e=get("pres-mo"); if(e) e.value="";
  mostrarPresupuestos(); actualizarDashboard(); toast("Presupuesto guardado");
}
function eliminarPresupuesto(id){
  if(!confirm("Eliminar?")) return;
  DB.presupuestos=DB.presupuestos.filter(p=>p.id!==id);
  guardarDB("presupuestos"); mostrarPresupuestos(); actualizarDashboard();
}
function mostrarPresupuestos(){
  const cnt=get("pres-count"); if(cnt) cnt.textContent=textoContadorPlan("presupuestos");
  const cont=get("lista-presupuestos"); if(!cont) return;
  if(!DB.presupuestos.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin presupuestos.</p>`;return;}
  cont.innerHTML=DB.presupuestos.map(p=>`<div class="item"><div class="item-row">
    <div><b>${p.cliente}</b>${p.obra?" — "+p.obra:""}<br>
    <small>📅 ${p.fecha} | ${p.items.length} ítems</small>
    <span class="monto-total">${fmt(p.total)}</span></div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm" onclick="exportarPresPDFById('${p.id}')">📄</button>
      <button class="btn btn-outline btn-sm" style="border-color:var(--yellow);color:var(--yellow)" onclick="exportarPresInternoPDFById('${p.id}')">🔒</button>
      <button class="btn btn-outline btn-sm" onclick="exportarPresWAById('${p.id}')">💬</button>
      <button class="btn btn-outline btn-sm" style="border-color:var(--cyan);color:var(--cyan)" onclick="pasarPresupuestoACompras('${p.id}')" title="Pedir estos materiales">🛒</button>
      <button class="btn btn-verde btn-sm" onclick="generarFacturaDesdePresupuesto('${p.id}')">🧾</button>
      <button class="btn btn-red btn-sm" onclick="eliminarPresupuesto('${p.id}')">✕</button>
    </div></div></div>`).join("");
}
function pasarPresupuestoACompras(id){
  const p=DB.presupuestos.find(x=>x.id===id); if(!p) return;
  const items=[...(p.items||[]), ...(p.componentes||[])];
  if(!items.length){ toast("Este presupuesto no tiene materiales cargados","red"); return; }
  items.forEach(i=>{ DB.compras.push({id:uid(), nombre:i.nombre, cant:i.cant, prov:"", fecha:hoy()}); });
  guardarDB("compras");
  ir("compras");
  toast(`${items.length} materiales de "${p.cliente}" agregados a la lista de compras`);
}
// ══════════════════════════════════════
// MEMBRETE PROFESIONAL PARA PDFs (presupuestos y facturas)
// ══════════════════════════════════════
function datosEmpresaPDF(){
  const ed = (typeof licenciaActual!=="undefined" && licenciaActual?.empresa_data) || {};
  return {
    nombre: ed.nombre || licenciaActual?.empresa || licenciaActual?.nombre || "Servicio Eléctrico Profesional",
    tel: ed.tel || "", dir: ed.dir || "",
    email: ed.email || (typeof usuarioActual!=="undefined" && usuarioActual?.email) || "",
    cuit: ed.cuit || "", web: ed.web || "",
    logo: (esPro() && licenciaActual?.logo_url) ? licenciaActual.logo_url : null,
  };
}
function membretePDF(){
  const e = datosEmpresaPDF();
  const contacto = [e.tel&&`📞 ${e.tel}`, e.email&&`✉ ${e.email}`, e.dir&&`📍 ${e.dir}`, e.cuit&&`CUIT ${e.cuit}`]
    .filter(Boolean).join(" &nbsp;·&nbsp; ");
  return `<div class="membrete">
    ${e.logo?`<img src="${e.logo}" class="logo">`:`<div class="logo-fallback">⚡</div>`}
    <div><div class="emp-nombre">${e.nombre}</div>
    ${contacto?`<div class="emp-contacto">${contacto}</div>`:""}</div>
  </div>`;
}
// Free: pequeño crédito de la app al pie. Pro: documento limpio, sin marca ajena.
function creditoAppPDF(){
  if (esPro()) return "";
  return `<div class="app-credit">Hecho con <b>Franz Electricista</b> — app de gestión diseñada para técnicos e ingenieros · una marca de Franz Electricidad</div>`;
}
const ESTILOS_PDF = `
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:36px 40px;font-size:12px;color:#1e293b}
  .membrete{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:3px solid #16a34a;margin-bottom:20px}
  .membrete .logo{width:52px;height:52px;object-fit:cover;border-radius:8px}
  .membrete .logo-fallback{width:52px;height:52px;border-radius:8px;background:#16a34a;color:#fff;
    display:flex;align-items:center;justify-content:center;font-size:24px}
  .emp-nombre{font-size:19px;font-weight:700;color:#0f172a}
  .emp-contacto{font-size:10.5px;color:#64748b;margin-top:2px}
  .doc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
  .doc-titulo{font-size:15px;font-weight:700;color:#16a34a;letter-spacing:.03em}
  .doc-num{font-family:'Courier New',monospace;font-size:11px;color:#64748b;margin-top:3px}
  .datos-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:11.5px}
  .datos-box b{color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{background:#16a34a;color:#fff;padding:9px 10px;text-align:left;font-size:10.5px;font-weight:600}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px}
  .totales{margin-top:14px;margin-left:auto;width:260px}
  .totales .fila{display:flex;justify-content:space-between;padding:5px 0;font-size:11.5px;color:#475569}
  .totales .final{border-top:2px solid #16a34a;margin-top:4px;padding-top:8px;font-size:16px;font-weight:700;color:#16a34a}
  .firma-area{margin-top:56px;display:flex;justify-content:space-between;gap:40px}
  .firma-linea{flex:1;border-top:1px solid #94a3b8;padding-top:6px;font-size:10px;color:#64748b;text-align:center}
  .firma-img{max-height:60px;margin-bottom:4px}
  .terminos{margin-top:26px;font-size:9.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
  .app-credit{margin-top:8px;font-size:8.5px;color:#cbd5e1;text-align:center}
  .estado-chip{display:inline-block;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;color:#fff}
`;

function modoExportElegido(){
  const sel=get("pres-modo-export");
  return (sel?sel.value:localStorage.getItem("franz-modo-export")) || "desglosado";
}

function genPDFPres(p, modo){
  modo = modo || "desglosado";
  const componentes=p.componentes||[];
  const adicionales=p.adicionales||[];
  const totalMat=p.items.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=componentes.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalAdic=adicionales.reduce((s,i)=>s+i.importe,0);
  const numero = "P-"+String(p.id||"").slice(-5).toUpperCase();

  let cuerpo;
  if(modo==="final"){
    // Modo "solo precio final": una sola línea con el trabajo, sin desglosar materiales/componentes
    cuerpo=`<table><thead><tr><th>Descripción</th><th style="text-align:right">Importe</th></tr></thead>
      <tbody><tr><td>${p.obra||"Instalación eléctrica completa"}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(p.total)}</td></tr></tbody></table>`;
  } else {
    const filasMat=p.items.map((item,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
      <td>${item.nombre}</td><td style="text-align:center">${item.cant}</td>
      <td style="text-align:right">${fmt(item.precio)}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(item.cant*item.precio)}</td></tr>`).join("");
    const filasComp=componentes.map((item,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
      <td>${item.nombre}</td><td style="text-align:center">${item.cant}</td>
      <td style="text-align:right">${fmt(item.precio)}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(item.cant*item.precio)}</td></tr>`).join("");
    const filasAdic=adicionales.map((item,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
      <td colspan="3">${item.concepto}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(item.importe)}</td></tr>`).join("");
    const seccion=(titulo,filas)=>filas?`<div class="doc-titulo" style="font-size:12px;margin:16px 0 6px">${titulo}</div>
      <table><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${filas}</tbody></table>`:"";
    cuerpo=`${seccion("1. MATERIALES", filasMat)}${seccion("2. COMPONENTES / PROTECCIONES", filasComp)}${seccion("4. ADICIONALES", filasAdic)}`;
  }

  const totalesHTML = modo==="final"
    ? `<div class="totales"><div class="fila final"><span>TOTAL</span><span>${fmt(p.total)}</span></div></div>`
    : `<div class="totales">
        <div class="fila"><span>Materiales</span><span>${fmt(totalMat)}</span></div>
        <div class="fila"><span>Componentes</span><span>${fmt(totalComp)}</span></div>
        <div class="fila"><span>Mano de obra</span><span>${fmt(p.mo||0)}</span></div>
        <div class="fila"><span>Adicionales</span><span>${fmt(totalAdic)}</span></div>
        <div class="fila final"><span>TOTAL</span><span>${fmt(p.total)}</span></div>
      </div>`;

  const html=`<html><head><meta charset="UTF-8"><title>Presupuesto ${numero}</title><style>${ESTILOS_PDF}</style></head><body>
    ${membretePDF()}
    <div class="doc-head">
      <div><div class="doc-titulo">PRESUPUESTO DE OBRA</div><div class="doc-num">N° ${numero} &nbsp;·&nbsp; ${p.fecha}</div></div>
    </div>
    <div class="datos-box">
      <b>Cliente:</b> ${p.cliente}${p.obra?` &nbsp;·&nbsp; <b>Obra:</b> ${p.obra}`:""}
    </div>
    ${cuerpo}
    ${totalesHTML}
    <div class="terminos">Presupuesto elaborado conforme a normativa AEA 90364 e IRAM vigente. Precios sujetos a variación según cotización de materiales. Validez: 15 días desde la fecha de emisión.</div>
    ${creditoAppPDF()}
  </body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 300);
}
function exportarPresPDF(){
  if(!presItemsActual.length && !presComponentesActual.length){toast("Sin ítems","red");return;}
  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);
  genPDFPres({
    cliente:val("pres-cliente"),obra:val("pres-obra"),
    items:presItemsActual,componentes:presComponentesActual,adicionales:presAdicionalesActual,
    mo,total:totalMat+totalComp+mo+totalAdic,fecha:hoy()
  }, modoExportElegido());
}
function exportarPresPDFById(id){ const p=DB.presupuestos.find(x=>x.id===id); if(p) genPDFPres(p, modoExportElegido()); }

// ══════════════════════════════════════
// PRESUPUESTO INTERNO — con costo y margen, NUNCA se le manda al cliente
// ══════════════════════════════════════
function genPDFPresInterno(p){
  const componentes=p.componentes||[];
  const filaConMargen=item=>{
    const costo=item.costo||0;
    const margenPct=costo>0?(((item.precio-costo)/costo)*100):null;
    return `<tr>
      <td>${item.nombre}</td><td style="text-align:center">${item.cant}</td>
      <td style="text-align:right">${fmt(costo)}</td>
      <td style="text-align:right">${fmt(item.precio)}</td>
      <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(item.cant*item.precio)}</td>
      <td style="text-align:right;color:${margenPct===null?"#94a3b8":margenPct>=0?"#16a34a":"#ef4444"}">${margenPct===null?"—":margenPct.toFixed(0)+"%"}</td>
    </tr>`;
  };
  const filasMat=p.items.map(filaConMargen).join("");
  const filasComp=componentes.map(filaConMargen).join("");
  const costoTotalMat=p.items.reduce((s,i)=>s+i.cant*(i.costo||0),0);
  const costoTotalComp=componentes.reduce((s,i)=>s+i.cant*(i.costo||0),0);
  const precioTotalMat=p.items.reduce((s,i)=>s+i.cant*i.precio,0);
  const precioTotalComp=componentes.reduce((s,i)=>s+i.cant*i.precio,0);
  const costoTotal=costoTotalMat+costoTotalComp;
  const precioTotal=precioTotalMat+precioTotalComp;
  const margenBruto=precioTotal-costoTotal;
  const margenPctTotal=costoTotal>0?((margenBruto/costoTotal)*100):0;
  const numero = "P-"+String(p.id||"").slice(-5).toUpperCase();
  const seccion=(titulo,filas)=>filas?`<div class="doc-titulo" style="font-size:12px;margin:16px 0 6px">${titulo}</div>
    <table><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Costo</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th><th style="text-align:right">Margen</th></tr></thead>
    <tbody>${filas}</tbody></table>`:"";
  const html=`<html><head><meta charset="UTF-8"><title>Presupuesto interno ${numero}</title><style>${ESTILOS_PDF}</style></head><body>
    <div style="background:#f59e0b;color:#000;font-weight:700;text-align:center;padding:8px;border-radius:8px;margin-bottom:16px;font-size:12px">
      🔒 USO INTERNO — NO ENVIAR AL CLIENTE
    </div>
    ${membretePDF()}
    <div class="doc-head">
      <div><div class="doc-titulo">PRESUPUESTO INTERNO (costo y margen)</div><div class="doc-num">N° ${numero} &nbsp;·&nbsp; ${p.fecha}</div></div>
    </div>
    <div class="datos-box">
      <b>Cliente:</b> ${p.cliente}${p.obra?` &nbsp;·&nbsp; <b>Obra:</b> ${p.obra}`:""}
    </div>
    ${seccion("MATERIALES", filasMat)}
    ${seccion("COMPONENTES / PROTECCIONES", filasComp)}
    <div class="totales" style="width:320px">
      <div class="fila"><span>Costo total</span><span>${fmt(costoTotal)}</span></div>
      <div class="fila"><span>Precio total (materiales+comp.)</span><span>${fmt(precioTotal)}</span></div>
      <div class="fila"><span>Mano de obra</span><span>${fmt(p.mo||0)}</span></div>
      <div class="fila"><span>Margen bruto</span><span style="color:${margenBruto>=0?"#16a34a":"#ef4444"}">${fmt(margenBruto)} (${margenPctTotal.toFixed(0)}%)</span></div>
      <div class="fila final"><span>TOTAL AL CLIENTE</span><span>${fmt(p.total)}</span></div>
    </div>
    <div class="terminos">Documento de uso interno — contiene información de costos y márgenes que no debe compartirse con el cliente.</div>
  </body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 300);
}
function exportarPresInternoPDF(){
  if(!presItemsActual.length && !presComponentesActual.length){toast("Sin ítems","red");return;}
  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);
  genPDFPresInterno({
    cliente:val("pres-cliente"),obra:val("pres-obra"),
    items:presItemsActual,componentes:presComponentesActual,
    mo,total:totalMat+totalComp+mo+totalAdic,fecha:hoy()
  });
}
function exportarPresInternoPDFById(id){ const p=DB.presupuestos.find(x=>x.id===id); if(p) genPDFPresInterno(p); }

// FACTURAS
function numeroFacturaSiguiente(){
  const n=(DB.facturas.length||0)+1;
  return "F-"+String(n).padStart(4,"0");
}
function guardarFactura(){
  if(limiteAlcanzado("facturas")){ bloquearPorLimite("facturas","facturas"); return; }
  const cliente=val("fac-cliente"), monto=parseFloat(val("fac-monto"))||0;
  if(!cliente){toast("Cliente obligatorio","red");return;}
  if(!monto){toast("Ingresá el monto","red");return;}
  const f={id:uid(),numero:numeroFacturaSiguiente(),cliente,concepto:val("fac-concepto"),
    items:[],total:monto,metodo:val("fac-metodo"),estado:val("fac-estado"),
    fecha:hoy(),fechaPago:val("fac-estado")==="Pagada"?hoy():null};
  DB.facturas.push(f); guardarDB("facturas");
  ["fac-concepto","fac-monto"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarFacturas(); actualizarDashboard(); toast(`Factura ${f.numero} generada`);
}
function generarFacturaDesdePresupuesto(id){
  if(limiteAlcanzado("facturas")){ bloquearPorLimite("facturas","facturas"); return; }
  const p=DB.presupuestos.find(x=>x.id===id); if(!p) return;
  const f={id:uid(),numero:numeroFacturaSiguiente(),cliente:p.cliente,concepto:p.obra||"",
    items:p.items,total:p.total,metodo:"Transferencia",estado:"Pendiente",
    fecha:hoy(),fechaPago:null,presupuestoId:p.id,mo:p.mo||0};
  DB.facturas.push(f); guardarDB("facturas");
  ir("facturas"); toast(`Factura ${f.numero} generada desde el presupuesto`);
}
function marcarFacturaPagada(id){
  const f=DB.facturas.find(x=>x.id===id); if(!f) return;
  f.estado="Pagada"; f.fechaPago=hoy();
  guardarDB("facturas"); mostrarFacturas(); actualizarDashboard(); toast("Factura marcada como pagada");
}
function eliminarFactura(id){
  if(!confirm("Eliminar factura?")) return;
  DB.facturas=DB.facturas.filter(f=>f.id!==id);
  guardarDB("facturas"); mostrarFacturas(); actualizarDashboard();
}
function mostrarFacturas(){
  const cnt=get("fac-count"); if(cnt) cnt.textContent=textoContadorPlan("facturas");
  const cont=get("lista-facturas"); if(!cont) return;
  const sel=get("fac-cliente");
  if(sel && sel.options.length<=1) sincronizarSelectClientes();
  if(!DB.facturas.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin facturas.</p>`;return;}
  const badgeEstado=e=>e==="Pagada"?'<span class="badge badge-green">PAGADA</span>':'<span class="badge badge-yellow">PENDIENTE</span>';
  cont.innerHTML=[...DB.facturas].reverse().map(f=>`<div class="item"><div class="item-row">
    <div><b>${escapeHtml(f.numero)}</b> — ${escapeHtml(f.cliente)} ${badgeEstado(f.estado)}<br>
    <small>${escapeHtml(f.concepto)||"—"} | 📅 ${f.fecha} | ${escapeHtml(f.metodo)}</small>
    <span class="monto-total">${fmt(f.total)}</span>
    ${f.fechaPago?`<br><small style="color:var(--muted2)">💰 Pagada el ${f.fechaPago}</small>`:""}
    </div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm" onclick="exportarFacturaPDF('${f.id}')">📄</button>
      ${f.estado!=="Pagada"?`<button class="btn btn-verde btn-sm" onclick="marcarFacturaPagada('${f.id}')">✔ Pagada</button>`:""}
      <button class="btn btn-red btn-sm" onclick="eliminarFactura('${f.id}')">✕</button>
    </div></div></div>`).join("");
}
function exportarFacturaPDF(id){
  const f=DB.facturas.find(x=>x.id===id); if(!f) return;
  const filasItems=f.items&&f.items.length ? f.items.map((item,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
    <td>${item.nombre}</td><td style="text-align:center">${item.cant}</td>
    <td style="text-align:right">${fmt(item.precio)}</td>
    <td style="text-align:right;font-weight:600;color:#16a34a">${fmt(item.cant*item.precio)}</td></tr>`).join("") : "";
  const colorEstado = f.estado==="Pagada" ? "#16a34a" : "#f59e0b";
  const html=`<html><head><meta charset="UTF-8"><title>Factura ${f.numero}</title><style>${ESTILOS_PDF}</style></head><body>
    ${membretePDF()}
    <div class="doc-head">
      <div><div class="doc-titulo">FACTURA / RECIBO</div><div class="doc-num">N° ${f.numero} &nbsp;·&nbsp; ${f.fecha}</div></div>
      <span class="estado-chip" style="background:${colorEstado}">${f.estado.toUpperCase()}</span>
    </div>
    <div class="datos-box">
      <b>Cliente:</b> ${f.cliente}${f.concepto?` &nbsp;·&nbsp; <b>Concepto:</b> ${f.concepto}`:""}
    </div>
    ${filasItems?`<table><thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${filasItems}</tbody></table>
    <div class="totales">
      <div class="fila"><span>Materiales</span><span>${fmt(f.items.reduce((s,i)=>s+i.cant*i.precio,0))}</span></div>
      ${f.mo?`<div class="fila"><span>Mano de obra</span><span>${fmt(f.mo)}</span></div>`:""}
      <div class="fila final"><span>TOTAL</span><span>${fmt(f.total)}</span></div>
    </div>`:`<div class="totales"><div class="fila final"><span>TOTAL</span><span>${fmt(f.total)}</span></div></div>`}
    <div class="datos-box" style="margin-top:16px"><b>Método de pago:</b> ${f.metodo}${f.fechaPago?` &nbsp;·&nbsp; <b>Pagado el:</b> ${f.fechaPago}`:""}</div>
    <div class="firma-area">
      <div class="firma-linea">Firma del profesional</div>
      <div class="firma-linea">Firma de conformidad del cliente</div>
    </div>
    <div class="terminos">Comprobante de cobro emitido conforme a la actividad declarada. Conservar como constancia de pago.</div>
    ${creditoAppPDF()}
  </body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 300);
}

// ══════════════════════════════════════
// EXPORTAR A EXCEL (.xlsx) — con membrete profesional
// ══════════════════════════════════════
async function exportarPresCSV(){
  if(!presItemsActual.length && !presComponentesActual.length){toast("Sin ítems","red");return;}
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet("Presupuesto");
  const e=datosEmpresaPDF();
  ws.columns=[{width:44},{width:10},{width:16},{width:16}];

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value=e.nombre;
  ws.getCell('A1').font={bold:true,size:16,color:{argb:'FF0F172A'}};

  const contacto=[e.tel&&`Tel: ${e.tel}`,e.email&&`Email: ${e.email}`,e.dir&&`Dir: ${e.dir}`].filter(Boolean);
  if(contacto.length){
    ws.mergeCells('A2:D2');
    ws.getCell('A2').value=contacto.join("   ·   ");
    ws.getCell('A2').font={size:9,color:{argb:'FF64748B'}};
  }

  ws.mergeCells('A4:B4');
  ws.getCell('A4').value="PRESUPUESTO DE OBRA";
  ws.getCell('A4').font={bold:true,size:13,color:{argb:'FF16A34A'}};
  ws.getCell('C4').value=hoy();
  ws.mergeCells('C4:D4');
  ws.getCell('C4').alignment={horizontal:'right'};
  ws.getCell('C4').font={size:10,color:{argb:'FF64748B'}};

  ws.mergeCells('A5:D5');
  const cliente=val("pres-cliente"), obra=val("pres-obra");
  ws.getCell('A5').value=`Cliente: ${cliente}${obra?"   ·   Obra: "+obra:""}`;
  ws.getCell('A5').font={size:10,color:{argb:'FF0F172A'}};

  let r=7;
  const modo=modoExportElegido();

  function seccion(titulo, items, esAdicional){
    ws.mergeCells(`A${r}:D${r}`);
    ws.getCell(`A${r}`).value=titulo;
    ws.getCell(`A${r}`).font={bold:true,size:11,color:{argb:'FF16A34A'}};
    r++;
    const head=ws.getRow(r);
    head.values=esAdicional?["Concepto","","","Importe"]:["Descripción","Cantidad","Precio unit.","Subtotal"];
    head.eachCell(c=>{
      c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16A34A'}};
      c.font={bold:true,color:{argb:'FFFFFFFF'}};
      c.alignment={vertical:'middle'};
    });
    r++;
    items.forEach(item=>{
      const row=ws.getRow(r);
      if(esAdicional){
        row.values=[item.concepto,"","",item.importe];
        row.getCell(4).numFmt='"$"#,##0';
      } else {
        row.values=[item.nombre,item.cant,item.precio,item.cant*item.precio];
        row.getCell(3).numFmt='"$"#,##0';
        row.getCell(4).numFmt='"$"#,##0';
      }
      row.eachCell(c=>{ c.border={bottom:{style:'thin',color:{argb:'FFE2E8F0'}}}; });
      if(r%2===0) row.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; });
      r++;
    });
    r++;
  }

  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);

  if(modo==="final"){
    seccion("PRESUPUESTO", [{nombre:val("pres-obra")||"Instalación eléctrica completa", cant:1, precio:totalMat+totalComp+mo+totalAdic}], false);
  } else {
    if(presItemsActual.length) seccion("1. MATERIALES", presItemsActual, false);
    if(presComponentesActual.length) seccion("2. COMPONENTES / PROTECCIONES", presComponentesActual, false);
    if(presAdicionalesActual.length) seccion("4. ADICIONALES", presAdicionalesActual, true);
  }

  if(modo==="final"){
    ws.getCell(`C${r}`).value="TOTAL"; ws.getCell(`C${r}`).font={bold:true,size:12,color:{argb:'FF16A34A'}};
    ws.getCell(`D${r}`).value=totalMat+totalComp+mo+totalAdic; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    ws.getCell(`D${r}`).font={bold:true,size:12,color:{argb:'FF16A34A'}};
    ws.getCell(`C${r}`).border={top:{style:'medium',color:{argb:'FF16A34A'}}};
    ws.getCell(`D${r}`).border={top:{style:'medium',color:{argb:'FF16A34A'}}};
  } else {
    ws.getCell(`C${r}`).value="Materiales"; ws.getCell(`C${r}`).font={size:10,color:{argb:'FF64748B'}};
    ws.getCell(`D${r}`).value=totalMat; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    r++;
    ws.getCell(`C${r}`).value="Componentes"; ws.getCell(`C${r}`).font={size:10,color:{argb:'FF64748B'}};
    ws.getCell(`D${r}`).value=totalComp; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    r++;
    ws.getCell(`C${r}`).value="Mano de obra"; ws.getCell(`C${r}`).font={size:10,color:{argb:'FF64748B'}};
    ws.getCell(`D${r}`).value=mo; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    r++;
    ws.getCell(`C${r}`).value="Adicionales"; ws.getCell(`C${r}`).font={size:10,color:{argb:'FF64748B'}};
    ws.getCell(`D${r}`).value=totalAdic; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    r++;
    ws.getCell(`C${r}`).value="TOTAL"; ws.getCell(`C${r}`).font={bold:true,size:12,color:{argb:'FF16A34A'}};
    ws.getCell(`D${r}`).value=totalMat+totalComp+mo+totalAdic; ws.getCell(`D${r}`).numFmt='"$"#,##0';
    ws.getCell(`D${r}`).font={bold:true,size:12,color:{argb:'FF16A34A'}};
    ws.getCell(`C${r}`).border={top:{style:'medium',color:{argb:'FF16A34A'}}};
    ws.getCell(`D${r}`).border={top:{style:'medium',color:{argb:'FF16A34A'}}};
  }

  if(!esPro()){
    r+=2;
    ws.mergeCells(`A${r}:D${r}`);
    ws.getCell(`A${r}`).value="Hecho con Franz Electricista — app de gestión para técnicos e ingenieros · una marca de Franz Electricidad";
    ws.getCell(`A${r}`).font={size:8,italic:true,color:{argb:'FFCBD5E1'}};
    ws.getCell(`A${r}`).alignment={horizontal:'center'};
  }

  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`Presupuesto_${(cliente||"Cliente").replace(/\s+/g,"_")}_${hoy().replace(/\//g,"-")}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
}
function exportarPresWA(){
  const totalMat=presItemsActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const totalComp=presComponentesActual.reduce((s,i)=>s+i.cant*i.precio,0);
  const mo=parseFloat(val("pres-mo"))||0;
  const totalAdic=presAdicionalesActual.reduce((s,i)=>s+i.importe,0);
  const total=totalMat+totalComp+mo+totalAdic;
  let msg=`⚡ *PRESUPUESTO FRANZ ELECTRICIDAD*\nCliente: ${val("pres-cliente")}\nFecha: ${hoy()}\n\n`;
  if(modoExportElegido()==="final"){
    msg+=`${val("pres-obra")||"Instalación eléctrica completa"}\n\n*TOTAL: ${fmt(total)}*`;
  } else {
    const lista=presItemsActual.map(i=>`• ${i.nombre} x${i.cant}: ${fmt(i.cant*i.precio)}`).join("\n");
    const listaComp=presComponentesActual.map(i=>`• ${i.nombre} x${i.cant}: ${fmt(i.cant*i.precio)}`).join("\n");
    const listaAdic=presAdicionalesActual.map(i=>`• ${i.concepto}: ${fmt(i.importe)}`).join("\n");
    if(lista) msg+=`*MATERIALES*\n${lista}\n\n`;
    if(listaComp) msg+=`*COMPONENTES*\n${listaComp}\n\n`;
    if(listaAdic) msg+=`*ADICIONALES*\n${listaAdic}\n\n`;
    msg+=`MO: ${fmt(mo)}\n*TOTAL: ${fmt(total)}*`;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}
function exportarPresWAById(id){
  const p=DB.presupuestos.find(x=>x.id===id); if(!p) return;
  const componentes=p.componentes||[], adicionales=p.adicionales||[];
  let msg=`⚡ *PRESUPUESTO FRANZ ELECTRICIDAD*\nCliente: ${p.cliente}\nFecha: ${p.fecha}\n\n`;
  if(modoExportElegido()==="final"){
    msg+=`${p.obra||"Instalación eléctrica completa"}\n\n*TOTAL: ${fmt(p.total)}*`;
  } else {
    const lista=p.items.map(i=>`• ${i.nombre} x${i.cant}: ${fmt(i.cant*i.precio)}`).join("\n");
    const listaComp=componentes.map(i=>`• ${i.nombre} x${i.cant}: ${fmt(i.cant*i.precio)}`).join("\n");
    const listaAdic=adicionales.map(i=>`• ${i.concepto}: ${fmt(i.importe)}`).join("\n");
    if(lista) msg+=`*MATERIALES*\n${lista}\n\n`;
    if(listaComp) msg+=`*COMPONENTES*\n${listaComp}\n\n`;
    if(listaAdic) msg+=`*ADICIONALES*\n${listaAdic}\n\n`;
    msg+=`MO: ${fmt(p.mo||0)}\n*TOTAL: ${fmt(p.total)}*`;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

// RELEVAMIENTO
// ══════════════════════════════════════
// CASILLAS CON RAYO ⚡ — reemplazo genérico de checkboxes nativos,
// reutilizable en cualquier parte de la app (Relevamiento, Omisiones, etc.)
// ══════════════════════════════════════
let casillasRayo={};
function toggleCasillaRayo(nombre){
  const box=get(`chk-box-${nombre}`), row=get(`chk-row-${nombre}`);
  if(!box||!row) return;
  const marcada=!!casillasRayo[nombre];
  casillasRayo[nombre]=!marcada;
  if(marcada){
    box.style.background="transparent"; box.style.borderColor="var(--muted2)"; box.innerHTML="";
    row.style.borderColor="var(--border)";
  } else {
    box.style.background="var(--verde)"; box.style.borderColor="var(--verde)"; box.innerHTML="⚡";
    row.style.borderColor="var(--verde)";
  }
}
function esCasillaMarcada(nombre){ return !!casillasRayo[nombre]; }
function limpiarCasillaRayo(nombre){
  casillasRayo[nombre]=false;
  const box=get(`chk-box-${nombre}`), row=get(`chk-row-${nombre}`);
  if(box){ box.style.background="transparent"; box.style.borderColor="var(--muted2)"; box.innerHTML=""; }
  if(row){ row.style.borderColor="var(--border)"; }
}

async function guardarRelevamiento(){
  const cliente=val("rel-cliente");
  if(!cliente){toast("Cliente obligatorio","red");return;}
  const id=uid();
  DB.relevamientos.push({id,cliente,dir:val("rel-dir"),tipo:val("rel-tipo"),
    gabinete:val("rel-gabinete"),diferencial:val("rel-diferencial"),
    termicas:val("rel-termicas"),pat:val("rel-pat"),
    aea:esCasillaMarcada("rel-aea"),interv:esCasillaMarcada("rel-interv"),
    obs:val("rel-obs"),fecha:hoy()});
  guardarDB("relevamientos");
  await confirmarFotosPendientes("rel","relevamiento",id,"hallazgo");
  limpiarFotosPendientes("rel","rel-fotos-preview");
  limpiarCasillaRayo("rel-aea"); limpiarCasillaRayo("rel-interv");
  mostrarRelevamientos(); toast("Relevamiento guardado");
}
function generarDiagnostico(){
  let txt="";
  if(val("rel-diferencial")==="No posee") txt+=`• <b>⚠ CRÍTICO:</b> Ausencia de protección diferencial. Riesgo de electrocución.<br>`;
  if(val("rel-pat")==="No posee") txt+=`• <b>⚠ CRÍTICO:</b> Ausencia de PAT. Incumplimiento AEA 90364.<br>`;
  if(val("rel-gabinete")==="Malo") txt+=`• Gabinete deficiente. Se recomienda reemplazo urgente.<br>`;
  if(val("rel-termicas")==="Malo") txt+=`• Térmicas deficientes. Requieren evaluación.<br>`;
  if(!esCasillaMarcada("rel-aea")) txt+=`• No cumple criterios AEA 90364 verificados.<br>`;
  if(esCasillaMarcada("rel-interv")) txt+=`• Intervenciones previas por terceros detectadas.<br>`;
  if(!txt) txt="✅ No se detectaron anomalías relevantes.";
  const el=get("rel-diagnostico"); el.innerHTML=txt; el.style.display="block";
  el.scrollIntoView({behavior:"smooth"});
}
async function eliminarRelevamiento(id){
  if(!confirm("Eliminar?")) return;
  DB.relevamientos=DB.relevamientos.filter(r=>r.id!==id);
  guardarDB("relevamientos"); mostrarRelevamientos();
  const fotos=await obtenerFotosDB("relevamiento",id);
  for(const f of fotos) await eliminarFotoDB(f.id);
}
function mostrarRelevamientos(){
  const cnt=get("rel-count"); if(cnt) cnt.textContent=DB.relevamientos.length;
  const cont=get("lista-relevamientos"); if(!cont) return;
  if(!DB.relevamientos.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin relevamientos.</p>`;return;}
  cont.innerHTML=DB.relevamientos.map(r=>`<div class="item"><div class="item-row">
    <div><b>${escapeHtml(r.cliente)}</b> <span class="badge badge-blue">${escapeHtml(r.tipo)}</span><br>
    <small>📍 ${escapeHtml(r.dir)||"—"} | 📅 ${r.fecha}</small><br>
    <small>Diferencial: ${escapeHtml(r.diferencial)} | PAT: ${escapeHtml(r.pat)} | Gabinete: ${escapeHtml(r.gabinete)}</small><br>
    <small>AEA: ${r.aea?'<span class="badge badge-green">SI</span>':'<span class="badge badge-red">NO</span>'}
    Intervenida: ${r.interv?'<span class="badge badge-yellow">SI</span>':'<span class="badge badge-green">NO</span>'}</small>
    </div>
    <div class="item-actions">
      <button class="btn btn-outline btn-sm btn-foto-galeria" id="rel-fotobtn-${r.id}" onclick="verGaleria('relevamiento','${r.id}','Fotos — ${escapeHtml(r.cliente)}')">📷…</button>
      <button class="btn btn-red btn-sm" onclick="eliminarRelevamiento('${r.id}')">✕</button>
    </div>
    </div></div>`).join("");
  pintarBotonesFotos("relevamiento", DB.relevamientos.map(r=>r.id), "rel-fotobtn-");
}

// CALCULADORAS AEA
function tabCalc(el,id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on")); el.classList.add("on");
  ["calc-canio","calc-tension","calc-cable","calc-motor","calc-pat","calc-materiales","calc-cargas"].forEach(c=>{
    const e=get(c); if(e) e.style.display=c===id?"block":"none";
  });
}
const tablaAEA={"1.5":{20:9,25:15,32:26,40:37,50:58},"2.5":{20:5,25:9,32:16,40:23,50:36},
  "4":{20:4,25:6,32:11,40:16,50:25},"6":{20:2,25:4,32:8,40:11,50:18},"10":{20:1,25:2,32:4,40:6,50:9}};
// Diámetro exterior real aproximado (mm) de cable unipolar IRAM NM 247-3, según ficha técnica de fabricante (Cobrhil)
const diametroExteriorConductor={"1.5":2.84,"2.5":3.66,"4":4.11,"6":4.95,"10":6.35};
// Medidas comerciales habituales de cable canal PVC en Argentina (ancho x alto, mm)
const medidasCanaleta={
  "20x12":{a:20,h:12}, "25x16":{a:25,h:16}, "32x25":{a:32,h:25}, "40x25":{a:40,h:25},
  "60x40":{a:60,h:40}, "80x60":{a:80,h:60}, "100x60":{a:100,h:60}, "130x60":{a:130,h:60},
  "150x100":{a:150,h:100}
};

function cambiarTipoCanalizacion(){
  const tipo=val("aea-tipo");
  const esBandeja = tipo==="bandeja";
  const wrapDiam=get("aea-diam-wrap"), wrapCanaleta=get("aea-canaleta-wrap"), notaBandeja=get("aea-bandeja-nota");
  if(wrapDiam) wrapDiam.style.display = esBandeja?"none":"block";
  if(wrapCanaleta) wrapCanaleta.style.display = esBandeja?"block":"none";
  if(notaBandeja){
    notaBandeja.style.display = esBandeja?"block":"none";
    if(esBandeja){
      notaBandeja.innerHTML=`ℹ️ Cálculo por área ocupada, con el diámetro real de cada conductor (IRAM NM 247-3) y el criterio AEA de ocupación máxima del 40% para 3 o más conductores. Las medidas de cable canal listadas son las comerciales habituales — confirmá la disponible en tu proveedor.`;
    }
  }
  const el=get("aea-resultado"); if(el) el.style.display="none";
}

let conductoresAEA=[];
function agregarConductorAEA(){
  const secc=val("aea-secc"), cant=parseInt(val("aea-cant"))||0;
  if(!cant){toast("Ingresá la cantidad","red");return;}
  conductoresAEA.push({secc,cant});
  const e=get("aea-cant"); if(e) e.value="";
  renderConductoresAEA();
}
function quitarConductorAEA(i){ conductoresAEA.splice(i,1); renderConductoresAEA(); }
function renderConductoresAEA(){
  const cont=get("aea-lista-conductores"); if(!cont) return;
  if(!conductoresAEA.length){cont.innerHTML="";return;}
  cont.innerHTML=conductoresAEA.map((c,i)=>`<div class="item"><div class="item-row">
    <div>${c.cant} × conductor ${c.secc}mm²</div>
    <button class="btn btn-red btn-sm" onclick="quitarConductorAEA(${i})">✕</button>
    </div></div>`).join("");
}
function calcAEA(){
  const tipo=val("aea-tipo");
  const el=get("aea-resultado");
  if(!conductoresAEA.length){el.innerHTML="⚠ Agregá al menos un conductor a la lista";el.style.display="block";return;}

  if(tipo==="bandeja"){
    calcAEACanaleta(el);
    return;
  }

  const diam=parseInt(val("aea-diam"));
  let fraccionUsada=0, detalle="", huboError=false;
  conductoresAEA.forEach(c=>{
    const tabla=tablaAEA[c.secc];
    const max=tabla?tabla[diam]:null;
    if(!max){ huboError=true; detalle+=`<div>⚠ Sin datos para conductores de ${c.secc}mm² en caño de ${diam}mm</div>`; return; }
    const frac=c.cant/max;
    fraccionUsada+=frac;
    detalle+=`<div>${c.cant} × ${c.secc}mm² → ${(frac*100).toFixed(0)}% de la capacidad del caño (si fuera solo esa sección, entrarían hasta ${max})</div>`;
  });
  if(huboError){ el.innerHTML=detalle; el.style.display="block"; return; }

  const margenCorrugado = tipo==="corrugado" ? 1.15 : 1;
  const pctFinal = fraccionUsada*margenCorrugado*100;
  const ok = pctFinal<=100;

  el.innerHTML=`
    <div style="margin-bottom:8px;font-size:.85em">${detalle}</div>
    <div style="font-size:1.1em;font-weight:700">Ocupación total: ${pctFinal.toFixed(0)}%${tipo==="corrugado"?" (con margen de seguridad aplicado)":""}</div>
    <div style="margin-top:4px">${ok?"✅ Los conductores entran en el caño elegido":"❌ No entran — probá un caño de mayor diámetro o dividí en dos canalizaciones"}</div>
    ${tipo==="corrugado"?`<div style="margin-top:8px;font-size:.78em;color:var(--muted2)">El caño corrugado suele tener un diámetro interno real algo menor al nominal — se aplicó un 15% de margen adicional por seguridad. Si el resultado da muy justo, verificá con el dato del fabricante.</div>`:""}
  `;
  el.style.display="block";
}
function calcAEACanaleta(el){
  const medida=val("aea-canaleta");
  const dims=medidasCanaleta[medida];
  if(!dims){el.innerHTML="⚠ Elegí una medida de cable canal";el.style.display="block";return;}

  // Área interna útil: se descuenta ~10% por el espesor de pared de la canaleta (aproximación razonable)
  const areaNominal=dims.a*dims.h;
  const areaUtil=areaNominal*0.9;
  const areaMaxima=areaUtil*0.40; // criterio AEA: máx. 40% de ocupación para 3 o más conductores

  let areaOcupada=0, detalle="", huboError=false, totalConductores=0;
  conductoresAEA.forEach(c=>{
    const dExt=diametroExteriorConductor[c.secc];
    if(!dExt){ huboError=true; detalle+=`<div>⚠ Sin dato de diámetro para ${c.secc}mm²</div>`; return; }
    const areaUnitaria=Math.PI*Math.pow(dExt/2,2);
    const areaTotalItem=areaUnitaria*c.cant;
    areaOcupada+=areaTotalItem;
    totalConductores+=c.cant;
    detalle+=`<div>${c.cant} × ${c.secc}mm² (Ø ext. ${dExt}mm) → ${areaTotalItem.toFixed(1)}mm²</div>`;
  });
  if(huboError){ el.innerHTML=detalle; el.style.display="block"; return; }

  const pctOcupacion=(areaOcupada/areaUtil)*100;
  const ok=areaOcupada<=areaMaxima;

  el.innerHTML=`
    <div style="margin-bottom:8px;font-size:.85em">${detalle}</div>
    <div style="font-size:.85em;color:var(--muted2);margin-bottom:8px">
      Cable canal ${medida}mm → área útil estimada: ${areaUtil.toFixed(0)}mm² · máximo permitido (40%): ${areaMaxima.toFixed(0)}mm²<br>
      Área total ocupada por los ${totalConductores} conductores: <b>${areaOcupada.toFixed(0)}mm² (${pctOcupacion.toFixed(0)}%)</b>
    </div>
    <div style="font-size:1.1em;font-weight:700">${ok?"✅ Entran dentro del criterio AEA (máx. 40% de ocupación)":"❌ Superan el 40% de ocupación permitido"}</div>
    <div style="margin-top:4px">${ok?"Podés usar este cable canal para estos conductores.":"Probá una medida de cable canal más grande, o dividí los conductores en dos canalizaciones."}</div>
    <div style="margin-top:8px;font-size:.75em;color:var(--muted2)">Cálculo basado en el diámetro exterior real de cable unipolar IRAM NM 247-3 (ficha técnica de fabricante) y el criterio AEA de ocupación máxima del 40% para 3 o más conductores. El área útil de la canaleta se estimó descontando un 10% por espesor de pared — verificá siempre con la medida real de tu proveedor si el resultado da muy justo.</div>
  `;
  el.style.display="block";
}
function calcCaidaTension(){
  const I=parseFloat(val("ct-corriente"))||0, L=parseFloat(val("ct-longitud"))||0;
  const S=parseFloat(val("ct-secc"))||2.5, mono=val("ct-sistema")==="mono";
  const Vn=mono?220:380, k=mono?2:1.732, dV=(k*0.0175*L*I)/S, pct=(dV/Vn)*100;
  const el=get("ct-resultado");
  if(!I||!L){el.innerHTML="⚠ Ingresá corriente y longitud";el.style.display="block";return;}
  el.innerHTML=`${pct<=3?"✅":"❌"} <b>Caída: ${dV.toFixed(2)}V (${pct.toFixed(2)}%)</b><br>Máximo AEA 3% = ${(Vn*0.03).toFixed(1)}V<br>${pct<=3?"Conductor apto.":'<span style="color:var(--red)">Supera límite. Aumentá la sección.</span>'}`;
  el.style.display="block";
}
function calcSeccionCable(){
  const P=parseFloat(val("sc-pot"))||0, V=parseFloat(val("sc-volt"))||220;
  const fp=parseFloat(val("sc-fp"))||0.9, L=parseFloat(val("sc-long"))||0;
  const mono=V===220, I=mono?P/(V*fp):P/(V*fp*1.732);
  const Smin=(mono?2:1.732)*0.0175*L*I/(V*0.03);
  const secciones=[1.5,2.5,4,6,10,16,25,35,50];
  const rec=secciones.find(s=>s>=Smin)||50;
  const Iadm={1.5:15,2.5:20,4:26,6:35,10:50,16:65,25:85,35:105,50:130};
  const el=get("sc-resultado");
  if(!P||!L){el.innerHTML="⚠ Ingresá potencia y longitud";el.style.display="block";return;}
  el.innerHTML=`⚡ Corriente: <b>${I.toFixed(2)}A</b><br>Sección mínima: ${Smin.toFixed(2)}mm²<br>✅ <b>Sección recomendada: ${rec}mm²</b> (Iadm: ${Iadm[rec]}A)`;
  el.style.display="block";
}
function calcMotor(){
  const potInput=parseFloat(val("mo-pot"))||0, unidad=val("mo-unidad");
  const V=parseFloat(val("mo-volt"))||380, eff=parseFloat(val("mo-eff"))||0.85, fp=parseFloat(val("mo-fp"))||0.85;
  const kW=unidad==="hp"?potInput*0.746:potInput, mono=V===220;
  const In=mono?kW*1000/(V*fp*eff):kW*1000/(V*fp*eff*1.732);
  const el=get("mo-resultado");
  if(!potInput){el.innerHTML="⚠ Ingresá la potencia";el.style.display="block";return;}
  el.innerHTML=`⚡ Potencia: <b>${kW.toFixed(2)}kW</b><br>Corriente nominal: <b>${In.toFixed(2)}A</b><br>Térmica: <b>${(In*1.25).toFixed(2)}A</b> | Contactor: <b>${(In*1.15).toFixed(2)}A</b>`;
  el.style.display="block";
}
function calcPAT(){
  const rho=parseFloat(val("pat-suelo"))||100, L=parseFloat(val("pat-long"))||1.5, d=parseFloat(val("pat-diam"))||14.3;
  const R=(rho/(2*Math.PI*L))*(Math.log(4*L/(d/1000))-1);
  const el=get("pat-resultado");
  el.innerHTML=`🌎 <b>Resistencia calculada: ${R.toFixed(2)}Ω</b><br>AEA máximo: 10Ω<br>${R<=10?"✅ Dentro del límite normativo":'<span style="color:var(--red)">❌ Supera el límite. Agregar más jabalinas en paralelo.</span>'}`;
  el.style.display="block";
}
function calcMateriales(){
  const L=parseFloat(val("mt-long"))||0, bocas=parseInt(val("mt-bocas"))||0;
  const cond=parseInt(val("mt-cond"))||3, diam=val("mt-diam"), tendido=val("mt-tendido");
  const el=get("mt-resultado");
  if(!L||!bocas){el.innerHTML="⚠ Ingresá longitud y cantidad de bocas";el.style.display="block";return;}

  const canioConDesperdicio=L*1.1;
  const barras3m=Math.ceil(canioConDesperdicio/3);
  const cableConDesperdicio=Math.ceil(L*1.15);
  const metrosCablePorConductor=cableConDesperdicio;
  const metrosCableTotal=metrosCablePorConductor*cond;
  const curvas=Math.max(1,Math.ceil(L/3));
  const conectores=Math.max(2,Math.ceil(L/3)+bocas);
  const cajas=bocas;
  const wagos=bocas*2;
  const abrazaderas=tendido==="vista"?Math.ceil(L/0.5):0;
  const tacos=tendido==="vista"?abrazaderas*2:0;

  el.innerHTML=`
    <b>📦 Materiales estimados para este circuito</b>
    <table style="width:100%;margin-top:8px;font-size:.8rem;border-collapse:collapse">
      <tr><td style="padding:4px 0">Caño PVC ${diam}mm</td><td style="text-align:right"><b>${barras3m} barra(s) de 3m</b> (${canioConDesperdicio.toFixed(1)}m netos)</td></tr>
      <tr><td style="padding:4px 0">Cable unipolar (por conductor)</td><td style="text-align:right"><b>${metrosCablePorConductor}m</b> × ${cond} conductores</td></tr>
      <tr><td style="padding:4px 0">Cable unipolar — total a comprar</td><td style="text-align:right"><b>${metrosCableTotal}m</b></td></tr>
      <tr><td style="padding:4px 0">Cajas (rectangular/octogonal)</td><td style="text-align:right"><b>${cajas}</b></td></tr>
      <tr><td style="padding:4px 0">Curvas/codos 90°</td><td style="text-align:right"><b>${curvas}</b></td></tr>
      <tr><td style="padding:4px 0">Conectores/uniones PVC</td><td style="text-align:right"><b>${conectores}</b></td></tr>
      <tr><td style="padding:4px 0">Wago / conectores rápidos</td><td style="text-align:right"><b>${wagos}</b></td></tr>
      ${tendido==="vista"?`<tr><td style="padding:4px 0">Abrazaderas (tendido a la vista)</td><td style="text-align:right"><b>${abrazaderas}</b></td></tr>
      <tr><td style="padding:4px 0">Tacos + tornillos</td><td style="text-align:right"><b>${tacos}</b></td></tr>`:""}
    </table>
    <div style="margin-top:10px"><button class="btn btn-outline btn-sm" onclick="pasarCalculoACompras()">🛒 Pasar a lista de compras</button></div>`;
  el.style.display="block";
  window._ultimoCalcMateriales={barras3m,diam,metrosCableTotal,cond,cajas,curvas,conectores,wagos,abrazaderas,tacos,tendido};
}
function pasarCalculoACompras(){
  const c=window._ultimoCalcMateriales; if(!c){toast("Calculá primero","red");return;}
  const items=[
    {nombre:`Caño PVC rígido ${c.diam}mm (barra 3m)`,cant:c.barras3m},
    {nombre:`Cable unipolar (a definir sección/color)`,cant:c.metrosCableTotal},
    {nombre:`Caja rectangular/octogonal PVC embutir`,cant:c.cajas},
    {nombre:`Curva 90° PVC ${c.diam}mm`,cant:c.curvas},
    {nombre:`Conector/unión PVC ${c.diam}mm`,cant:c.conectores},
    {nombre:`Wago / conector rápido`,cant:c.wagos},
  ];
  if(c.tendido==="vista"){
    items.push({nombre:`Abrazadera ${c.diam}mm`,cant:c.abrazaderas});
    items.push({nombre:`Taco + tornillo`,cant:c.tacos});
  }
  items.forEach(i=>{ if(i.cant>0) DB.compras.push({id:uid(),nombre:i.nombre,cant:i.cant,prov:"",fecha:hoy()}); });
  guardarDB("compras"); ir("compras"); toast("Materiales agregados a compras");
}

// ══════════════════════════════════════
// CÓMPUTO DE CARGAS — consumo total, corriente y conductor principal
// ══════════════════════════════════════
let cargasElectricas=[];
function agregarCargaElectrica(){
  const nombre=val("carga-nombre"), pot=parseFloat(val("carga-pot"))||0, cant=parseInt(val("carga-cant"))||1;
  if(!nombre||!pot){toast("Completá el nombre y la potencia","red");return;}
  cargasElectricas.push({nombre,pot,cant});
  const eNom=get("carga-nombre"), ePot=get("carga-pot"), eCant=get("carga-cant");
  if(eNom) eNom.value=""; if(ePot) ePot.value=""; if(eCant) eCant.value="1";
  renderCargasElectricas();
}
function quitarCargaElectrica(i){ cargasElectricas.splice(i,1); renderCargasElectricas(); }
function renderCargasElectricas(){
  const cont=get("carga-lista"); if(!cont) return;
  if(!cargasElectricas.length){cont.innerHTML="";return;}
  cont.innerHTML=cargasElectricas.map((c,i)=>`<div class="item"><div class="item-row">
    <div>${c.cant} × ${c.nombre} — ${c.pot.toLocaleString("es-AR")}W c/u <b style="color:var(--verde)">(${(c.pot*c.cant).toLocaleString("es-AR")}W total)</b></div>
    <button class="btn btn-red btn-sm" onclick="quitarCargaElectrica(${i})">✕</button>
    </div></div>`).join("");
}
function calcularCargasElectricas(){
  const el=get("carga-resultado");
  if(!cargasElectricas.length){el.innerHTML="⚠ Agregá al menos un equipo a la lista";el.style.display="block";return;}

  const sistema=val("carga-sistema"), fp=parseFloat(val("carga-fp"))||0.9;
  const V=sistema==="mono"?220:380;
  const potenciaTotal=cargasElectricas.reduce((s,c)=>s+c.pot*c.cant,0);
  const corriente=sistema==="mono" ? potenciaTotal/(V*fp) : potenciaTotal/(V*fp*1.732);

  const secciones=[1.5,2.5,4,6,10,16,25,35,50,70,95];
  const Iadm={1.5:15,2.5:20,4:26,6:35,10:50,16:65,25:85,35:105,50:130,70:165,95:200};
  const seccionRecomendada=secciones.find(s=>Iadm[s]>=corriente)||95;

  const breakersEstandar=[6,10,16,20,25,32,40,50,63,80,100,125];
  const proteccionRecomendada=breakersEstandar.find(b=>b>=corriente)||125;

  const detalle=cargasElectricas.map(c=>`<div>${c.cant} × ${c.nombre}: ${(c.pot*c.cant).toLocaleString("es-AR")}W</div>`).join("");

  el.innerHTML=`
    <div style="margin-bottom:10px;font-size:.85em">${detalle}</div>
    <div style="font-size:1.05em;font-weight:700">Potencia instalada total: ${(potenciaTotal/1000).toFixed(2)}kW (${potenciaTotal.toLocaleString("es-AR")}W)</div>
    <div style="margin-top:4px;font-size:1.05em;font-weight:700">Corriente total: ${corriente.toFixed(1)}A</div>
    <div style="margin-top:10px;font-size:1.15em;font-weight:900;color:var(--verde)">✅ Conductor principal recomendado: ${seccionRecomendada}mm² (Iadm ${Iadm[seccionRecomendada]}A)</div>
    <div style="margin-top:4px;font-size:.95em">Protección termomagnética sugerida: <b>${proteccionRecomendada}A</b></div>
    <div style="margin-top:10px;font-size:.75em;color:var(--muted2)">
      Este cálculo suma el 100% de la potencia de todos los equipos cargados, sin aplicar factor de simultaneidad/demanda —
      así el resultado nunca queda corto, aunque en una instalación grande donde no todo funciona al mismo tiempo,
      un profesional puede ajustar la sección con un factor de demanda de la AEA 90364 según su criterio.
      Verificá también la caída de tensión en la calculadora correspondiente si el recorrido es largo.
    </div>
  `;
  el.style.display="block";
}


// OMISIONES
const CHECKLISTS={
  residencial:["Diferencial 30mA instalado y operativo","PAT (jabalina+caja inspección) presente","Protecciones bipolares en todos los circuitos","Separación iluminación/tomas/fuerza","Cañerías AEA (20/25mm, curvas, conectores)","Cajas rectangulares/octogonales en cada boca","Conductores con colores normalizados AEA","Tablero con gabinete adecuado","Conexión a tierra de masas metálicas","Circuito cocina independiente 20A"],
  comercial:["Diferencial 30mA por circuito","PAT según AEA 90364","Protecciones bipolares","Tablero con DPS","Iluminación de emergencia","Extintor señalizado","Conductores identificados","Medición de tierra documentada","Circuito fuerza separado","Borneras rotuladas en tablero"],
  industrial:["Diferencial tipo A para variadores","PAT con medición protocolizada","Canalización metálica o bandeja","Guardamotor por cada motor","Pulsador seta emergencia accesible","Señalización de tablero","Cable apantallado para señales","Cierre de tablero con llave","Protección de neutro","Conductor PE identificado"],
  frigorifico:["Contactor apropiado para compresor","Relé térmico calibrado","Termostato operativo","Timer de descongelamiento","Cañería flexible en conexión compresor","IP67 en tomas de cámara","Capacitor de marcha correcto","Iluminación IP65 interior","Diferencial tipo A","PAT de masas metálicas"],
  pat:["Jabalina copperweld instalada","Caja de inspección accesible","Grapa de conexión apretada","Cable verde/amarillo correcto","Barra equipotencial presente","Medición < 10Ω","Gel conductor aplicado","Protocolo SRT 900/15 realizado"],
  tablero:["Gabinete con IP adecuado","Diferencial general instalado","Térmica general calibrada","Térmicas de circuito instaladas","Peine de distribución correcto","Barra de neutros conectada","Barra de tierra conectada","Cables rotulados","DPS instalado","Tapa ciega en módulos vacíos"],
};
let checkSeleccionados=new Set();
function cargarChecklist(tipo){
  const cont=get("om-checklist"), btns=get("om-btns");
  checkSeleccionados=new Set();
  if(!tipo||!CHECKLISTS[tipo]){cont.innerHTML="";if(btns)btns.style.display="none";return;}
  cont.innerHTML=CHECKLISTS[tipo].map((item,i)=>`
    <div class="check-item" id="chk-item-${i}" onclick="toggleCheckOmision(${i})"
      style="display:flex;align-items:center;gap:12px;padding:11px 14px;margin-bottom:7px;
      border:1.5px solid var(--border);border-radius:9px;cursor:pointer;transition:.15s;user-select:none">
      <div id="chk-box-${i}" style="width:24px;height:24px;border-radius:6px;border:2px solid var(--muted2);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:900;color:#fff;transition:.15s"></div>
      <span style="font-size:.86rem;text-transform:none">${escapeHtml(item)}</span>
    </div>`).join("");
  if(btns) btns.style.display="flex";
}
function toggleCheckOmision(i){
  const box=get(`chk-box-${i}`), row=get(`chk-item-${i}`);
  if(!box||!row) return;
  if(checkSeleccionados.has(i)){
    checkSeleccionados.delete(i);
    box.style.background="transparent"; box.style.borderColor="var(--muted2)"; box.innerHTML="";
    row.style.borderColor="var(--border)";
  } else {
    checkSeleccionados.add(i);
    box.style.background="var(--verde)"; box.style.borderColor="var(--verde)"; box.innerHTML="⚡";
    row.style.borderColor="var(--verde)";
  }
}
function guardarOmision(){
  const tipo=val("om-tipo"); if(!tipo){toast("Seleccioná un tipo","red");return;}
  const checklist=CHECKLISTS[tipo]||[];
  const resultados=checklist.map((item,i)=>({item,ok:checkSeleccionados.has(i)}));
  const ok=resultados.filter(r=>r.ok).length;
  DB.omisiones.push({id:uid(),tipo,obra:val("om-obra"),resultados,ok,total:checklist.length,fecha:hoy()});
  guardarDB("omisiones"); mostrarOmisiones(); toast("Verificación guardada");
}
function exportarOmisionPDF(){
  const tipo=val("om-tipo"); if(!tipo){toast("Completá el checklist","red");return;}
  const checklist=CHECKLISTS[tipo]||[];
  const ok=checkSeleccionados.size;
  const filas=checklist.map((item,i)=>`<tr><td>${item}</td><td style="text-align:center;color:${checkSeleccionados.has(i)?"#16a34a":"#ef4444"}">${checkSeleccionados.has(i)?"✅ Conforme":"❌ No conforme"}</td></tr>`).join("");
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:30px;font-size:12px}
    h1{color:#16a34a}table{width:100%;border-collapse:collapse;margin-top:10px}
    th{background:#16a34a;color:#fff;padding:8px}td{padding:7px;border-bottom:1px solid #ddd}</style></head><body>
    <h1>⚡ FRANZ ELECTRICIDAD — Verificación</h1>
    <p>Tipo: <b>${tipo}</b> | Obra: <b>${val("om-obra")||"—"}</b> | Fecha: <b>${hoy()}</b></p>
    <p>Resultado: <b>${ok}/${checklist.length} ítems conformes</b></p>
    <table><thead><tr><th>Ítem</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>
    </body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}
function eliminarOmision(id){
  if(!confirm("Eliminar?")) return;
  DB.omisiones=DB.omisiones.filter(o=>o.id!==id);
  guardarDB("omisiones"); mostrarOmisiones();
}
function mostrarOmisiones(){
  const cnt=get("om-count"); if(cnt) cnt.textContent=DB.omisiones.length;
  const cont=get("lista-omisiones"); if(!cont) return;
  if(!DB.omisiones.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin verificaciones.</p>`;return;}
  cont.innerHTML=DB.omisiones.map(o=>`<div class="item"><div class="item-row">
    <div><b>${o.tipo}</b>${o.obra?" — "+o.obra:""}<br>
    <small>📅 ${o.fecha} | ${o.ok}/${o.total} conformes
    <span class="badge ${o.ok===o.total?"badge-green":o.ok>o.total/2?"badge-yellow":"badge-red"}">${Math.round(o.ok/o.total*100)}%</span></small></div>
    <div class="item-actions"><button class="btn btn-red btn-sm" onclick="eliminarOmision('${o.id}')">✕</button></div>
    </div></div>`).join("");
}

// COMPRAS
function agregarItemCompra(){
  const nombre=val("comp-nombre");
  if(!nombre){toast("Ingresá el material","red");return;}
  DB.compras.push({id:uid(),nombre,cant:parseInt(val("comp-cant"))||1,prov:val("comp-prov"),fecha:hoy()});
  guardarDB("compras");
  ["comp-nombre","comp-cant","comp-prov"].forEach(id=>{const e=get(id);if(e)e.value="";});
  mostrarCompras(); toast("Ítem agregado");
}
function eliminarItemCompra(id){ DB.compras=DB.compras.filter(c=>c.id!==id); guardarDB("compras"); mostrarCompras(); }
function limpiarCompras(){ if(!confirm("Limpiar lista?")) return; DB.compras=[]; guardarDB("compras"); mostrarCompras(); }
function mostrarCompras(){
  const cnt=get("comp-count"); if(cnt) cnt.textContent=DB.compras.length;
  const cont=get("lista-compras"); if(!cont) return;
  if(!DB.compras.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Lista vacía.</p>`;return;}
  cont.innerHTML=DB.compras.map(c=>`<div class="item"><div class="item-row">
    <div><b>${c.nombre}</b> <span class="badge badge-yellow">×${c.cant}</span>
    ${c.prov?`<br><small>🚚 ${c.prov}</small>`:""}</div>
    <button class="btn btn-red btn-sm" onclick="eliminarItemCompra('${c.id}')">✕</button>
    </div></div>`).join("");
}
function exportarComprasPDF(){
  if(!DB.compras.length){toast("Lista vacía","red");return;}
  const filas=DB.compras.map((c,i)=>`<tr style="background:${i%2?"#f8f9fa":"white"}"><td>${c.nombre}</td><td style="text-align:center">${c.cant}</td><td>${c.prov||"—"}</td></tr>`).join("");
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;margin:30px;font-size:12px}h1{color:#16a34a}table{width:100%;border-collapse:collapse}th{background:#16a34a;color:#fff;padding:8px}td{padding:7px;border-bottom:1px solid #ddd}</style></head><body>
    <h1>⚡ FRANZ ELECTRICIDAD — Lista de compras</h1><p>Fecha: ${hoy()} | ${DB.compras.length} ítems</p>
    <table><thead><tr><th>Material</th><th>Cantidad</th><th>Proveedor</th></tr></thead><tbody>${filas}</tbody></table></body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
}
async function exportarComprasCSV(){
  if(!DB.compras.length){toast("Lista vacía","red");return;}
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet("Lista de compras");
  const e=datosEmpresaPDF();
  ws.columns=[{width:44},{width:12},{width:30}];

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value=e.nombre;
  ws.getCell('A1').font={bold:true,size:16,color:{argb:'FF0F172A'}};

  const contacto=[e.tel&&`Tel: ${e.tel}`,e.email&&`Email: ${e.email}`,e.dir&&`Dir: ${e.dir}`].filter(Boolean);
  if(contacto.length){
    ws.mergeCells('A2:C2');
    ws.getCell('A2').value=contacto.join("   ·   ");
    ws.getCell('A2').font={size:9,color:{argb:'FF64748B'}};
  }

  ws.mergeCells('A4:B4');
  ws.getCell('A4').value="LISTA DE COMPRAS";
  ws.getCell('A4').font={bold:true,size:13,color:{argb:'FF16A34A'}};
  ws.getCell('C4').value=hoy();
  ws.getCell('C4').alignment={horizontal:'right'};
  ws.getCell('C4').font={size:10,color:{argb:'FF64748B'}};

  const head=ws.getRow(6);
  head.values=["Material","Cantidad","Proveedor"];
  head.eachCell(c=>{
    c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16A34A'}};
    c.font={bold:true,color:{argb:'FFFFFFFF'}};
    c.alignment={vertical:'middle'};
  });

  let r=7;
  DB.compras.forEach(item=>{
    const row=ws.getRow(r);
    row.values=[item.nombre,item.cant,item.prov||"—"];
    row.eachCell(c=>{ c.border={bottom:{style:'thin',color:{argb:'FFE2E8F0'}}}; });
    if(r%2===0) row.eachCell(c=>{ c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}; });
    r++;
  });

  r++;
  ws.getCell(`A${r}`).value=`Total: ${DB.compras.length} ítems`;
  ws.getCell(`A${r}`).font={bold:true,italic:true,size:10,color:{argb:'FF475569'}};

  if(!esPro()){
    r+=2;
    ws.mergeCells(`A${r}:C${r}`);
    ws.getCell(`A${r}`).value="Hecho con Franz Electricista — app de gestión para técnicos e ingenieros · una marca de Franz Electricidad";
    ws.getCell(`A${r}`).font={size:8,italic:true,color:{argb:'FFCBD5E1'}};
    ws.getCell(`A${r}`).alignment={horizontal:'center'};
  }

  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`Lista_Compras_${e.nombre.replace(/\s+/g,"_")}_${hoy().replace(/\//g,"-")}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
}
function exportarComprasWA(){
  if(!DB.compras.length){toast("Lista vacía","red");return;}
  const lista=DB.compras.map(c=>`• ${c.nombre} x${c.cant}${c.prov?" ("+c.prov+")":""}`).join("\n");
  window.open(`https://wa.me/?text=${encodeURIComponent(`🛒 *LISTA DE COMPRAS — FRANZ ELECTRICIDAD*\nFecha: ${hoy()}\n\n${lista}`)}`, "_blank");
}

// HISTORIAL
function mostrarHistorial(){ filtrarHistorial(""); }
function filtrarHistorial(txt){
  const tipo=val("hist-tipo"), cont=get("lista-historial"); if(!cont) return;
  let items=[];
  if(!tipo||tipo==="cliente") DB.clientes.forEach(c=>items.push({tipo:"cliente",titulo:c.nombre,sub:`Tel: ${c.tel||"—"}`,fecha:c.fecha,id:c.id}));
  if(!tipo||tipo==="obra") DB.obras.forEach(o=>items.push({tipo:"obra",titulo:o.nombre,sub:`${o.cliente} · ${o.estado}`,fecha:o.fechaReg,id:o.id}));
  if(!tipo||tipo==="presupuesto") DB.presupuestos.forEach(p=>items.push({tipo:"presupuesto",titulo:`Presupuesto ${p.cliente}`,sub:fmt(p.total),fecha:p.fecha,id:p.id}));
  if(!tipo||tipo==="relevamiento") DB.relevamientos.forEach(r=>items.push({tipo:"relevamiento",titulo:r.cliente,sub:`${r.tipo} · PAT: ${r.pat}`,fecha:r.fecha,id:r.id}));
  if(txt) items=items.filter(i=>i.titulo.toLowerCase().includes(txt.toLowerCase())||i.sub.toLowerCase().includes(txt.toLowerCase()));
  items.sort((a,b)=>b.id.localeCompare(a.id));
  if(!items.length){cont.innerHTML=`<p style="color:var(--muted);margin-top:10px;font-size:.82rem">Sin registros.</p>`;return;}
  const colors={cliente:"badge-green",obra:"badge-cyan",presupuesto:"badge-yellow",relevamiento:"badge-blue"};
  cont.innerHTML=items.map(i=>`<div class="item"><div class="item-row">
    <div><b>${i.titulo}</b> <span class="badge ${colors[i.tipo]||"badge-cyan"}">${i.tipo}</span><br>
    <small>${i.sub} | 📅 ${i.fecha}</small></div></div></div>`).join("");
}

// EXPORT (utilidad legacy — ya no la usan los export de compras/presupuestos, que ahora son .xlsx)
function descargarCSV(csv,nombre){
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=nombre; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════
// TARIFARIO DE REFERENCIA — AAIERIC (Costos Sugeridos de Mano de Obra)
// Fuente: aaieric.org.ar/costos-mano-de-obra · Julio 2026 · aplicable oficialmente a CABA/GBA.
// Esto NO se actualiza solo desde la web (una app no puede leer otros sitios
// por seguridad del navegador) — es una referencia que trajimos a mano.
// Si pasó mucho tiempo desde julio 2026, conviene verificar en la fuente.
// ══════════════════════════════════════
const TARIFARIO_AAIERIC = {
  fecha: "Julio 2026",
  fuente: "AAIERIC — aaieric.org.ar/costos-mano-de-obra",
  items: [
    {nombre:"Visita / diagnóstico / presupuesto", valor:54310},
    {nombre:"Hora de trabajo (mínimo)", valor:54310},
    {nombre:"Boca completa (canalización + cableado + conexión)", valor:108431},
    {nombre:"Urgencia (noche / feriado, mínimo)", valor:130203},
    {nombre:"Tablero Principal monofásico (1 ID + 1 TM + PAT)", valor:320310},
    {nombre:"Tablero Principal trifásico (1 ID + 1 TM + PAT)", valor:433760},
    {nombre:"Tablero seccional hasta 8 polos", valor:227652},
    {nombre:"PAT de servicio (jabalina + caja de inspección)", valor:162585},
    {nombre:"Protocolo de puesta a tierra (SRT 900/15)", valor:636071},
    {nombre:"Jornal 8hs — Oficial Especializado", valor:49514},
    {nombre:"Jornal 8hs — Oficial Electricista", valor:42354},
    {nombre:"Jornal 8hs — Medio Oficial Electricista", valor:39140},
    {nombre:"Jornal 8hs — Ayudante", valor:36027},
  ]
};
function abrirTarifarioAAIERIC(){
  const modal=document.createElement("div");
  modal.className="modal-overlay";
  modal.innerHTML=`
    <div class="modal-box" style="max-width:540px">
      <h3 style="margin-bottom:4px">📋 Tarifario de referencia — AAIERIC</h3>
      <p style="color:var(--muted2);font-size:.78rem;margin-bottom:12px">
        Costos sugeridos de mano de obra, ${TARIFARIO_AAIERIC.fecha}. Fuente: ${TARIFARIO_AAIERIC.fuente} —
        valores oficiales para CABA/GBA. No se actualiza sola desde la web; si pasó mucho tiempo, conviene verificarlo en la fuente.
        Los valores son editables: si te parece mucho o poco para tu caso, cambialo antes de tocar "Usar".
      </p>
      <div class="fld">
        <label>Zona</label>
        <select id="tarifario-zona" onchange="renderTarifarioAAIERIC()">
          <option value="1">CABA / GBA (valor oficial AAIERIC)</option>
          <option value="0.82">Interior de Buenos Aires y otras provincias (estimado, -18%)</option>
        </select>
      </div>
      <div id="tarifario-lista" style="max-height:340px;overflow-y:auto;margin-top:10px"></div>
      <button class="btn btn-outline btn-full" style="margin-top:12px" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click",e=>{ if(e.target===modal) modal.remove(); });
  renderTarifarioAAIERIC();
}
function renderTarifarioAAIERIC(){
  const cont=get("tarifario-lista"); if(!cont) return;
  const factor=parseFloat(get("tarifario-zona")?.value)||1;
  cont.innerHTML=TARIFARIO_AAIERIC.items.map((item,i)=>{
    const valor=Math.round(item.valor*factor);
    return `<div class="item"><div class="item-row" style="align-items:center">
      <div style="flex:1"><b style="font-size:.85rem">${item.nombre}</b></div>
      <div class="item-actions" style="display:flex;align-items:center;gap:8px">
        <input type="text" inputmode="numeric" id="tarifario-val-${i}" value="${valor.toLocaleString("es-AR")}"
          style="width:120px;margin:0;padding:6px 8px;font-size:.85rem;text-align:right;color:var(--verde);font-weight:700;font-variant-numeric:tabular-nums"
          onblur="this.value=(parseInt(this.value.replace(/[^0-9]/g,''))||0).toLocaleString('es-AR')">
        <button class="btn btn-outline btn-sm" onclick="usarValorTarifario(${i})">Usar</button>
      </div>
    </div></div>`;
  }).join("");
}
function usarValorTarifario(i){
  const input=get(`tarifario-val-${i}`);
  const valor=parseInt((input?.value||"").replace(/[^0-9]/g,""))||0;
  const e=get("pres-mo");
  if(e){ e.value=valor; actualizarTotalPres(); }
  document.querySelector(".modal-overlay")?.remove();
  toast("Mano de obra actualizada");
}

// INIT
document.addEventListener("DOMContentLoaded",()=>{
  const tema=localStorage.getItem("franz-tema"); if(tema) cambiarTema(tema);
  actualizarDashboard(); sincronizarSelectClientes(); iniciarPlantillas();
  const fd=get("ob-fecha"); if(fd&&!fd.value) fd.value=new Date().toISOString().split("T")[0];
  const modoGuardado=localStorage.getItem("franz-modo-export");
  const selModo=get("pres-modo-export");
  if(modoGuardado && selModo) selModo.value=modoGuardado;
});
