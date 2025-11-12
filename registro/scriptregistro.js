// ===============================
// FUNCIÓN DE TOAST
// ===============================
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    toast.remove();
  }, duration);
}

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

  hideAllSections();
  const panel = document.getElementById("panel");
  if (panel) {
    panel.classList.remove("d-none");
    navBtns[0]?.classList.add("active");
  }

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
// BOTÓN CERRAR SESIÓN
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        showToast("Has cerrado sesión correctamente.", "success");
        window.location.href = "..//html/Proyecto_SISCOM.html";
      }
    });
  }
});

// ===============================
// REGISTRO DE MEDICAMENTOS
// ===============================
(function(){
  const guardarBtn = document.getElementById("guardarBtn");
  const tablaMedicamentos = document.querySelector("#tablaMedicamentos tbody");

  if (guardarBtn) {
    guardarBtn.addEventListener("click", async () => {
      const nombre = document.getElementById("nombre").value.trim();
      const dosis = document.getElementById("dosis").value.trim();
      const frecuencia = parseInt(document.getElementById("frecuencia").value, 10);
      const hora = document.getElementById("hora").value;

      if (!nombre || !dosis || !frecuencia || !hora) {
        showToast("Por favor complete todos los campos.", "warning");
        return;
      }

      const datos = { nombre, dosis, frecuencia_horas: frecuencia, hora };

      try {
        const resp = await fetch("http://localhost:3000/Registro_medicamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });

        const resultado = await resp.json();
        showToast(resultado.mensaje || "Medicamento registrado correctamente.", "success");

        document.getElementById("nombre").value = "";
        document.getElementById("dosis").value = "";
        document.getElementById("frecuencia").value = "";
        document.getElementById("hora").value = "";

        cargarRegistroMedicamentos();

      } catch (error) {
        // console.error("Error al guardar medicamento:", error);
        showToast("No se pudo conectar con el servidor.", "danger");
      }
    });
  }

  async function cargarRegistroMedicamentos() {
    try {
      const respuesta = await fetch("http://localhost:3000/Registro_medicamentos");
      const data = await respuesta.json();
      renderMedicamentos(data);
    } catch (err) {
      // console.error("Error al cargar registro:", err);
      showToast("Error al cargar registro de medicamentos.", "danger");
    }
  }

  function renderMedicamentos(lista) {
    if (!tablaMedicamentos) return;
    tablaMedicamentos.innerHTML = "";
    lista.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td>${escapeHtml(m.dosis)}</td>
        <td>${m.frecuencia_horas}</td>
        <td>${m.hora}</td>
      `;
      tablaMedicamentos.appendChild(tr);
    });
  }

  cargarRegistroMedicamentos();
})();

// ===============================
// INVENTARIO
// ===============================
(function(){
  const registrarBtn = document.getElementById("registrarBtn");
  const tablaInv = document.querySelector("#tablaInventario tbody");

  if (registrarBtn) {
    registrarBtn.addEventListener("click", async () => {
      const nombre = document.getElementById("nombreInv").value.trim();
      const cantidad = parseInt(document.getElementById("cantidadInv").value, 10);
      const consumo_por_dosis = parseInt(document.getElementById("consumoInv").value, 10);

      if (!nombre || isNaN(cantidad) || isNaN(consumo_por_dosis)) {
        showToast("Por favor complete todos los campos correctamente.", "warning");
        return;
      }

      const datos = { nombre, cantidad, consumo_por_dosis };

      try {
        const resp = await fetch("http://localhost:3000/inventario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });

        const resultado = await resp.json();
        showToast(resultado.mensaje || "Medicamento agregado al inventario.", "success");
        cargarInventario();
        clearInvForm();

      } catch (error) {
        // console.error("Error al guardar en inventario:", error);
        showToast("No se pudo conectar con el servidor.", "danger");
      }
    });
  }

  async function cargarInventario() {
    try {
      const respuesta = await fetch("http://localhost:3000/inventario");
      const data = await respuesta.json();
      renderInventario(data);
    } catch (err) {
      // console.error("Error al cargar inventario:", err);
      showToast("Error al cargar inventario.", "danger");
    }
  }

  function renderInventario(lista) {
    if (!tablaInv) return;
    tablaInv.innerHTML = "";
    lista.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td>${m.cantidad}</td>
        <td>${m.consumo_por_dosis}</td>
        <td>${new Date(m.fecha_registro).toLocaleString()}</td>
      `;
      tablaInv.appendChild(tr);
    });
  }

  function clearInvForm() {
    document.getElementById("nombreInv").value = "";
    document.getElementById("cantidadInv").value = "";
    document.getElementById("consumoInv").value = "";
  }

  cargarInventario();
})();

// ===============================
// FICHA MÉDICA
// ===============================
(function(){
  const alergiasInput = document.getElementById("alergiasInput");
  const condicionesInput = document.getElementById("condicionesInput");
  const listaAlergias = document.getElementById("listaAlergias");
  const listaCondiciones = document.getElementById("listaCondiciones");
  const alertaCritica = document.getElementById("alertaCritica");
  const btnAgregarAlergia = document.getElementById("btnAgregarAlergia");
  const btnAgregarCondicion = document.getElementById("btnAgregarCondicion");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnLimpiar = document.getElementById("btnLimpiar");

  if (!btnAgregarAlergia || !btnGuardar) return;

  const alergias = [];
  const condiciones = [];

  btnAgregarAlergia.addEventListener("click", () => {
    const valor = alergiasInput.value.trim();
    if (valor) {
      alergias.push(valor);
      renderList(listaAlergias, alergias);
      alergiasInput.value = "";
    }
    checkCritico();
  });

  btnAgregarCondicion.addEventListener("click", () => {
    const valor = condicionesInput.value.trim();
    const nivel = document.getElementById("nivelCondicion").value;
    if (valor) {
      condiciones.push({ nombre: valor, nivel });
      renderCondiciones();
      condicionesInput.value = "";
    }
    checkCritico();
  });

  function renderList(ul, items) {
    ul.innerHTML = items.map(i => `<li class="list-group-item">${escapeHtml(i)}</li>`).join("");
  }

  function renderCondiciones() {
    listaCondiciones.innerHTML = condiciones
      .map(c => `<li class="list-group-item">${escapeHtml(c.nombre)} — <strong>${escapeHtml(c.nivel)}</strong></li>`)
      .join("");
  }

  function checkCritico() {
    const tieneCritico = condiciones.some(c => c.nivel === "Crítica");
    alertaCritica.classList.toggle("oculto", !tieneCritico);
  }

  btnGuardar.addEventListener("click", async () => {
    const nombre = document.getElementById("nombreFicha").value.trim();
    const fechaNac = document.getElementById("fechaNac").value;

    if (!nombre || !fechaNac) {
      showToast("Completa nombre y fecha de nacimiento.", "warning");
      return;
    }

    const ficha = { nombre, fechaNac, alergias, condiciones };

    try {
      const resp = await fetch("http://localhost:3000/guardarFichaMedica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ficha)
      });

      const resultado = await resp.json();

      if (resp.ok) {
        showToast(resultado.mensaje || "Ficha médica guardada correctamente.", "success");
        alergias.length = 0;
        condiciones.length = 0;
        renderList(listaAlergias, []);
        renderCondiciones();
        alertaCritica.classList.add("oculto");
        document.getElementById("nombreFicha").value = "";
        document.getElementById("fechaNac").value = "";
      } else {
        showToast("Error: " + (resultado.mensaje || "No se pudo guardar la ficha."), "danger");
      }

    } catch (error) {
      // console.error("Error al enviar ficha médica:", error);
      showToast("Error de conexión con el servidor.", "danger");
    }
  });

  btnLimpiar.addEventListener("click", () => {
    if (confirm("¿Deseas limpiar la ficha?")) {
      alergias.length = 0;
      condiciones.length = 0;
      renderList(listaAlergias, []);
      renderCondiciones();
      alertaCritica.classList.add("oculto");
    }
  });
})();

// ===============================
// UTILIDAD
// ===============================
function escapeHtml(str){
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
// ===============================