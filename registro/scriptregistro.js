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
// BOTÓN CERRAR SESIÓN
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        alert("Has cerrado sesión correctamente.");
        window.location.href = "index.html";
      }
    });
  }
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
        alert("Por favor complete todos los campos.");
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
        alert("No se pudo conectar con el servidor.");
      }
    });
  }

  async function cargarRegistroMedicamentos() {
    try {
      const respuesta = await fetch("http://localhost:3000/Registro_medicamentos");
      const data = await respuesta.json();
      renderMedicamentos(data);
    } catch (err) {
      console.error("Error al cargar registro:", err);
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
        <td>${new Date(m.fecha_registro).toLocaleString()}</td>
      `;
      tablaMedicamentos.appendChild(tr);
    });
  }

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
        alert("Por favor complete todos los campos correctamente.");
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
        alert(resultado.mensaje || "Medicamento agregado al inventario.");
        cargarInventario();
        clearInvForm();

      } catch (error) {
        console.error("Error al guardar en inventario:", error);
        alert("No se pudo conectar con el servidor.");
      }
    });
  }

  async function cargarInventario() {
    try {
      const respuesta = await fetch("http://localhost:3000/inventario");
      const data = await respuesta.json();
      renderInventario(data);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
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
    ul.innerHTML = items.map(i => `<li>${escapeHtml(i)}</li>`).join("");
  }

  function renderCondiciones() {
    listaCondiciones.innerHTML = condiciones
      .map(c => `<li>${escapeHtml(c.nombre)} — <strong>${escapeHtml(c.nivel)}</strong></li>`)
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
      alert("Completa nombre y fecha de nacimiento.");
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
        alert(resultado.mensaje || "✅ Ficha médica guardada correctamente.");
        alergias.length = 0;
        condiciones.length = 0;
        renderList(listaAlergias, []);
        renderCondiciones();
        alertaCritica.classList.add("oculto");
        document.getElementById("nombreFicha").value = "";
        document.getElementById("fechaNac").value = "";
      } else {
        alert("⚠️ Error: " + (resultado.mensaje || "No se pudo guardar la ficha."));
      }

    } catch (error) {
      console.error("Error al enviar ficha médica:", error);
      alert("❌ Error de conexión con el servidor.");
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
// MÓDULO DE CITAS MÉDICAS
// ===============================
(function(){
  const formCita = document.getElementById('formCita');
  const fechaInput = document.getElementById('fechaCita');
  const horaInput = document.getElementById('horaCita');
  const motivoInput = document.getElementById('motivoCita');
  const anticipacionInput = document.getElementById('anticipacion');
  const listaCitasEl = document.getElementById('listaCitas');
  const resumenEl = document.getElementById('resumenCitas');
  const limpiarCitaBtn = document.getElementById('limpiarCitaBtn');
  const borrarTodasCitasBtn = document.getElementById('borrarTodasCitasBtn');

  if (!formCita) return; // Si el módulo no está cargado, salir

  let citas = [];
  let timeoutsProgramados = {};

  // Inicialización
  cargarCitasDesdeServidor();
  solicitarPermisoNotificacionSiNecesario();

  // Solicitar permisos de notificación
  async function solicitarPermisoNotificacionSiNecesario() {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones.');
      return;
    }
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('Permiso de notificaciones denegado.', e);
      }
    }
  }

  // Cargar citas desde el servidor
  async function cargarCitasDesdeServidor() {
    try {
      const resp = await fetch("http://localhost:3000/obtenerCitas");
      if (resp.ok) {
        const data = await resp.json();
        citas = data.map(c => ({
          id: c.id,
          datetime: c.fecha_hora,
          motivo: c.motivo,
          anticipacion: c.anticipacion_min || 60
        }));
        renderizarLista();
        programarTodasNotificaciones();
      }
    } catch (error) {
      console.error("Error al cargar citas:", error);
    }
  }

  // Combinar fecha y hora en un objeto Date
  function combinarFechaHora(fechaStr, horaStr) {
    if (!fechaStr || !horaStr) return null;
    return new Date(`${fechaStr}T${horaStr}:00`);
  }

  // Formatear fecha y hora
  function formatearFechaHora(date) {
    if (!(date instanceof Date)) return '';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  // Verificar si una fecha es pasada
  function esPasada(date) {
    return date.getTime() <= Date.now();
  }

  // Renderizar lista de citas
  function renderizarLista() {
    citas.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    listaCitasEl.innerHTML = '';

    if (citas.length === 0) {
      const noHay = document.createElement('div');
      noHay.className = 'sin-citas';
      noHay.textContent = 'No hay citas registradas.';
      listaCitasEl.appendChild(noHay);
      resumenEl.textContent = 'No hay citas registradas.';
      return;
    }

    citas.forEach(cita => {
      const citaDate = new Date(cita.datetime);
      const li = document.createElement('div');
      li.className = 'list-group-item';
      if (esPasada(citaDate)) li.classList.add('cita-pasada');

      const info = document.createElement('div');
      info.className = 'cita-info';
      
      const fechaSpan = document.createElement('div');
      fechaSpan.className = 'cita-fecha';
      fechaSpan.textContent = formatearFechaHora(citaDate);
      
      const motivoSpan = document.createElement('div');
      motivoSpan.className = 'cita-motivo';
      motivoSpan.textContent = cita.motivo;
      
      const meta = document.createElement('div');
      meta.className = 'cita-meta';
      meta.textContent = `Notificar ${cita.anticipacion} min antes`;

      info.append(fechaSpan, motivoSpan, meta);

      const acciones = document.createElement('div');
      acciones.className = 'cita-acciones';
      
      const verBtn = document.createElement('button');
      verBtn.className = 'btn btn-sm btn-outline-primary';
      verBtn.innerHTML = '<i class="bi bi-eye"></i>';
      verBtn.onclick = () =>
        alert(`Cita:\nFecha: ${formatearFechaHora(citaDate)}\nMotivo: ${cita.motivo}\nNotificar: ${cita.anticipacion} minutos antes`);
      
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-outline-danger';
      delBtn.innerHTML = '<i class="bi bi-trash"></i>';
      delBtn.onclick = () => {
        if (confirm('¿Eliminar esta cita?')) eliminarCita(cita.id);
      };
      
      acciones.append(verBtn, delBtn);
      li.append(info, acciones);
      listaCitasEl.appendChild(li);
    });

    // Actualizar resumen
    const proximas = citas.filter(c => new Date(c.datetime) > new Date());
    if (proximas.length === 0) {
      resumenEl.textContent = 'No hay citas futuras.';
    } else {
      resumenEl.textContent = `Próxima cita: ${formatearFechaHora(new Date(proximas[0].datetime))} — ${proximas[0].motivo}`;
    }
  }

  // Programar notificaciones
  function programarTodasNotificaciones() {
    for (const id in timeoutsProgramados) {
      clearTimeout(timeoutsProgramados[id]);
    }
    timeoutsProgramados = {};
    citas.forEach(cita => {
      scheduleNotificationForCita(cita);
    });
  }

  function scheduleNotificationForCita(cita) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const citaDate = new Date(cita.datetime);
    const anticipacionMin = Number(cita.anticipacion || 60);
    const notificacionDate = new Date(citaDate.getTime() - anticipacionMin * 60000);
    const delay = notificacionDate.getTime() - Date.now();

    if (delay <= 0) return;
    const MAX_DELAY = 2147483647;
    if (delay > MAX_DELAY) return;

    const timeoutId = setTimeout(() => {
      mostrarNotificacion(cita);
      delete timeoutsProgramados[cita.id];
    }, delay);

    timeoutsProgramados[cita.id] = timeoutId;
  }

  function mostrarNotificacion(cita) {
    try {
      const citaDate = new Date(cita.datetime);
      const titulo = '🩺 Recordatorio de cita';
      const body = `${formatearFechaHora(citaDate)} — ${cita.motivo}`;
      new Notification(titulo, { body, tag: `cita-${cita.id}`, renotify: true });
    } catch (e) {
      console.error('Error mostrando notificación', e);
    }
  }

  // Agregar nueva cita
  async function agregarCitaDesdeFormulario(e) {
    e.preventDefault();

    const fecha = fechaInput.value;
    const hora = horaInput.value;
    const motivo = motivoInput.value.trim();
    const anticipacion = anticipacionInput.value;

    if (!fecha || !hora || !motivo) {
      alert('Completa fecha, hora y motivo.');
      return;
    }

    const dt = combinarFechaHora(fecha, hora);
    if (!dt || isNaN(dt.getTime())) {
      alert('Fecha u hora inválida.');
      return;
    }

    // ID del paciente (puedes ajustar según tu lógica de sesión)
    const id_paciente = 1;
    const fecha_hora = dt.toISOString().slice(0, 19).replace('T', ' ');

    try {
      const res = await fetch('http://localhost:3000/guardarCita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_paciente,
          fecha_hora,
          motivo,
          anticipacion_min: anticipacion
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || '✅ Cita guardada correctamente');
        formCita.reset();
        anticipacionInput.value = '60';
        cargarCitasDesdeServidor();
      } else {
        alert('Error: ' + data.mensaje);
      }

    } catch (error) {
      console.error('❌ Error al enviar la cita:', error);
      alert('Error al conectar con el servidor.');
    }
  }

  // Eliminar cita
  async function eliminarCita(id) {
    try {
      const res = await fetch(`http://localhost:3000/eliminarCita/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || 'Cita eliminada');
        cargarCitasDesdeServidor();
      } else {
        alert('Error: ' + data.mensaje);
      }
    } catch (error) {
      console.error('Error al eliminar cita:', error);
      alert('Error al conectar con el servidor.');
    }
  }

  // Borrar todas las citas
  async function borrarTodasCitas() {
    if (!confirm('¿Seguro que deseas borrar todas las citas?')) return;
    
    try {
      const res = await fetch('http://localhost:3000/eliminarTodasCitas', {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || 'Todas las citas eliminadas');
        cargarCitasDesdeServidor();
      } else {
        alert('Error: ' + data.mensaje);
      }
    } catch (error) {
      console.error('Error al eliminar citas:', error);
      alert('Error al conectar con el servidor.');
    }
  }

  // Event listeners
  formCita.addEventListener('submit', agregarCitaDesdeFormulario);
  limpiarCitaBtn.addEventListener('click', () => formCita.reset());
  borrarTodasCitasBtn.addEventListener('click', borrarTodasCitas);

  // Re-programar notificaciones cuando la página vuelve a ser visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') programarTodasNotificaciones();
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
// ==================================
// OBTENER TODAS LAS CITAS
// ==================================
app.get('/obtenerCitas', (req, res) => {
  const sql = 'SELECT * FROM citas ORDER BY fecha_hora ASC';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener citas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener las citas.' });
    }
    res.status(200).json(results);
  });
});

// ==================================
// ELIMINAR UNA CITA
// ==================================
app.delete('/eliminarCita/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM citas WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar cita:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar la cita.' });
    }
    res.status(200).json({ mensaje: '✅ Cita eliminada correctamente.' });
  });
});

// ==================================
// ELIMINAR TODAS LAS CITAS
// ==================================
app.delete('/eliminarTodasCitas', (req, res) => {
  const sql = 'DELETE FROM citas';
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar todas las citas:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar las citas.' });
    }
    res.status(200).json({ mensaje: '✅ Todas las citas eliminadas correctamente.' });
  });
});