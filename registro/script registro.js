// ===============================
// NAVEGACIÓN ENTRE SECCIONES
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const navBtns = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".section");

  function hideAllSections() {
    sections.forEach(s => s.classList.add("d-none"));
    navBtns.forEach(b => b.classList.remove("active"));
  }

  // Show panel by default
  hideAllSections();
  const panel = document.getElementById("panel");
  if (panel) panel.classList.remove("d-none");

  // Attach events
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (!sectionId) return;
      hideAllSections();
      btn.classList.add("active");
      const s = document.getElementById(sectionId);
      if (s) s.classList.remove("d-none");
    });
  });
});

// ===============================
// MEDICAMENTOS (RECORDATORIOS) - persistidos en localStorage
// ===============================
(function(){
  const guardarBtn = document.getElementById("guardarBtn");
  const tablaMedicamentos = document.querySelector("#tablaMedicamentos tbody");
  let medicamentos = JSON.parse(localStorage.getItem("siscom_medicamentos") || "[]");

  // render inicial
  renderMedicamentos();

  if (guardarBtn) {
    // request notification permission early
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().catch(()=>{});
    }

    guardarBtn.addEventListener("click", () => {
      const nombre = document.getElementById("nombre").value.trim();
      const dosis = document.getElementById("dosis").value.trim();
      const frecuencia = parseInt(document.getElementById("frecuencia").value, 10);
      const hora = document.getElementById("hora").value;

      if (!nombre || !dosis || !frecuencia || !hora) {
        alert("Por favor, complete todos los campos antes de guardar.");
        return;
      }

      const item = { nombre, dosis, frecuencia, hora };
      medicamentos.push(item);
      localStorage.setItem("siscom_medicamentos", JSON.stringify(medicamentos));
      renderMedicamentos();
      // schedule first notification (while page open)
      scheduleMedicationNotification(item);
      // clear form
      document.getElementById("nombre").value = "";
      document.getElementById("dosis").value = "";
      document.getElementById("frecuencia").value = "";
      document.getElementById("hora").value = "";
      alert(`Medicamento "${nombre}" guardado y recordatorio programado.`);
    });
  }

  function renderMedicamentos(){
    if (!tablaMedicamentos) return;
    tablaMedicamentos.innerHTML = "";
    medicamentos.forEach((m, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td>${escapeHtml(m.dosis)}</td>
        <td>${m.frecuencia}</td>
        <td>${m.hora}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" data-idx="${idx}" data-action="eliminar">Eliminar</button>
        </td>
      `;
      tablaMedicamentos.appendChild(tr);
    });
  }

  // delegate delete
  if (tablaMedicamentos) {
    tablaMedicamentos.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      if (action === "eliminar") {
        if (!confirm("Eliminar este medicamento?")) return;
        medicamentos.splice(idx,1);
        localStorage.setItem("siscom_medicamentos", JSON.stringify(medicamentos));
        renderMedicamentos();
      }
    });
  }

  // Scheduling notifications (simple — works while page is open)
  function scheduleMedicationNotification(item) {
    if (!("Notification" in window)) return;
    const now = new Date();
    const [h,m] = item.hora.split(":").map(Number);
    let first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    if (first <= now) first.setDate(first.getDate() + 1);
    const delay = first - now;
    const intervalMs = item.frecuencia * 3600 * 1000;

    setTimeout(() => {
      showNotification(item.nombre, item.dosis);
      setInterval(() => {
        showNotification(item.nombre, item.dosis);
      }, intervalMs);
    }, delay);
  }

  // schedule existing meds on load
  medicamentos.forEach(m => scheduleMedicationNotification(m));

  function showNotification(nombre, dosis) {
    const title = "Recordatorio de Medicamento";
    const body = `Es hora de tomar ${nombre} (${dosis})`;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "https://cdn-icons-png.flaticon.com/512/2966/2966483.png" });
      } catch (err) {
        alert(`${title}\n${body}`);
      }
    } else {
      alert(body);
    }
  }

})();

// ===============================
// INVENTARIO (persistido en localStorage)
// ===============================
(function(){
  const registrarBtn = document.getElementById("registrarBtn");
  const tablaInv = document.querySelector("#tablaInventario tbody");
  let inventario = JSON.parse(localStorage.getItem("siscom_inventario") || "[]");

  renderInventario();

  if (registrarBtn) {
    registrarBtn.addEventListener("click", () => {
      const nombre = document.getElementById("nombreInv").value.trim();
      const cantidad = parseInt(document.getElementById("cantidadInv").value,10);
      const consumo = parseInt(document.getElementById("consumoInv").value,10);

      if (!nombre || isNaN(cantidad) || isNaN(consumo)) {
        alert("Por favor, completa todos los campos correctamente.");
        return;
      }

      inventario.push({ nombre, cantidad, consumo, alerta: Math.max(1, consumo * 5) });
      localStorage.setItem("siscom_inventario", JSON.stringify(inventario));
      renderInventario();
      clearInvForm();

      if (cantidad <= (consumo * 5)) {
        lowInventoryAlert(nombre);
      }
    });
  }

  // delegate table actions (consumir)
  if (tablaInv) {
    tablaInv.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.idx,10);
      if (action === "consumir") consumir(idx);
      else if (action === "eliminar") eliminar(idx);
      else if (action === "editar") editar(idx);
    });
  }

  function renderInventario(){
    if (!tablaInv) return;
    tablaInv.innerHTML = "";
    inventario.forEach((m, idx) => {
      const low = m.cantidad <= (m.alerta || (m.consumo * 5));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td class="${low ? "alerta-baja" : ""}">${m.cantidad}</td>
        <td>${m.consumo}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-2" data-action="consumir" data-idx="${idx}"><i class="bi bi-cup-hot"></i> Consumir</button>
          <button class="btn btn-sm btn-outline-secondary me-2" data-action="editar" data-idx="${idx}">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="eliminar" data-idx="${idx}">Eliminar</button>
        </td>
      `;
      tablaInv.appendChild(tr);

      if (low) lowInventoryAlert(m.nombre);
    });
  }

  function consumir(i){
    const m = inventario[i];
    if (!m) return;
    if (m.cantidad <= 0) { alert(`No quedan unidades de ${m.nombre}`); return; }
    m.cantidad -= m.consumo;
    if (m.cantidad < 0) m.cantidad = 0;
    localStorage.setItem("siscom_inventario", JSON.stringify(inventario));
    renderInventario();
    if (m.cantidad <= (m.alerta || (m.consumo * 5))) lowInventoryAlert(m.nombre);
  }

  function editar(i){
    const m = inventario[i];
    if (!m) return;
    document.getElementById("nombreInv").value = m.nombre;
    document.getElementById("cantidadInv").value = m.cantidad;
    document.getElementById("consumoInv").value = m.consumo;
    inventario.splice(i,1);
    localStorage.setItem("siscom_inventario", JSON.stringify(inventario));
    renderInventario();
  }

  function eliminar(i){
    if (!confirm("Eliminar este medicamento del inventario?")) return;
    inventario.splice(i,1);
    localStorage.setItem("siscom_inventario", JSON.stringify(inventario));
    renderInventario();
  }

  function lowInventoryAlert(nombre){
    alert(`Inventario bajo: ${nombre}. Por favor reponga.`);
    console.log(`[SIMULADO] Correo: inventario bajo de ${nombre}`);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Inventario bajo", { body: `Quedan pocas unidades de ${nombre}`, icon: "https://cdn-icons-png.flaticon.com/512/2966/2966483.png" });
      } catch(e){}
    }
  }

  function clearInvForm(){
    document.getElementById("nombreInv").value = "";
    document.getElementById("cantidadInv").value = "";
    document.getElementById("consumoInv").value = "";
  }

})();
 
// small helper
function escapeHtml(str){
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
