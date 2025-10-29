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

document.addEventListener("DOMContentLoaded", () => {
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        // Aquí puedes agregar la lógica real de cierre de sesión si tienes login
        alert("Has cerrado sesión correctamente.");
        window.location.href = "index.html"; // redirige a la página de inicio o login
      }
    });
  }
});


  // Mostrar panel por defecto
  hideAllSections();
  const panel = document.getElementById("panel");
  if (panel) panel.classList.remove("d-none");

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
// REGISTRO DE MEDICAMENTOS (tabla Registro_medicamentos)
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
        alert(" Por favor complete todos los campos.");
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
        alert(resultado.mensaje || "✅ Medicamento registrado correctamente.");

        document.getElementById("nombre").value = "";
        document.getElementById("dosis").value = "";
        document.getElementById("frecuencia").value = "";
        document.getElementById("hora").value = "";

        cargarRegistroMedicamentos();

      } catch (error) {
        console.error("Error al guardar medicamento:", error);
        alert(" No se pudo conectar con el servidor.");
      }
    });
  }

  // Cargar medicamentos registrados desde el backend
  async function cargarRegistroMedicamentos() {
    try {
      const respuesta = await fetch("http://localhost:3000/Registro_medicamentos");
      const data = await respuesta.json();
      renderMedicamentos(data);
    } catch (err) {
      console.error("Error al cargar registro:", err);
    }
  }

  // Render tabla
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
        <td>${new Date(m.fecha_registro).toLocaleString()}</td>
      `;
      tablaMedicamentos.appendChild(tr);
    });
  }

  // Cargar al inicio
  cargarRegistroMedicamentos();

})();

// ===============================
// INVENTARIO (tabla inventario)
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
        alert(" Por favor complete todos los campos correctamente.");
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
        alert(resultado.mensaje || " Medicamento agregado al inventario.");
        cargarInventario();
        clearInvForm();

      } catch (error) {
        console.error("Error al guardar en inventario:", error);
        alert(" No se pudo conectar con el servidor.");
      }
    });
  }

  // Obtener datos del inventario
  async function cargarInventario() {
    try {
      const respuesta = await fetch("http://localhost:3000/inventario");
      const data = await respuesta.json();
      renderInventario(data);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    }
  }

  // Renderizar tabla
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
