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

  // Mostrar panel por defecto medicamentos
  hideAllSections();
  const medicamentos = document.getElementById("medicamentos");
  if (medicamentos) {
    medicamentos.classList.remove("d-none");
    document.querySelector('.nav-btn[data-section="medicamentos"]')?.classList.add('active');
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
        window.location.href = "../index.html";
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
        alert(resultado.mensaje || "Medicamento registrado correctamente.");

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
  const modoActualizarCheckbox = document.getElementById("modoActualizar");
  const selectMedicamentoRow = document.getElementById("selectMedicamentoRow");
  const inputNombreRow = document.getElementById("inputNombreRow");
  const consumoRow = document.getElementById("consumoRow");
  const selectMedicamento = document.getElementById("selectMedicamento");

  let inventarioActual = [];

  // Toggle entre modo nuevo y actualizar
  if (modoActualizarCheckbox) {
    modoActualizarCheckbox.addEventListener("change", () => {
      const esModoActualizar = modoActualizarCheckbox.checked;
      selectMedicamentoRow.style.display = esModoActualizar ? "block" : "none";
      inputNombreRow.style.display = esModoActualizar ? "none" : "block";
      consumoRow.style.display = esModoActualizar ? "none" : "block";

      if (esModoActualizar) {
        cargarMedicamentosParaSeleccion();
      }
    });
  }

  async function cargarMedicamentosParaSeleccion() {
    try {
      const respuesta = await fetch("http://localhost:3000/inventario");
      const data = await respuesta.json();
      inventarioActual = data;

      selectMedicamento.innerHTML = '<option value="">Selecciona un medicamento</option>';
      data.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = `${item.nombre} (Stock actual: ${item.cantidad})`;
        selectMedicamento.appendChild(option);
      });
    } catch (error) {
      console.error("Error al cargar medicamentos:", error);
    }
  }

  if (registrarBtn) {
    registrarBtn.addEventListener("click", async () => {
      const esModoActualizar = modoActualizarCheckbox.checked;
      const cantidad = parseInt(document.getElementById("cantidadInv").value, 10);

      if (isNaN(cantidad) || cantidad < 1) {
        alert("Por favor ingrese una cantidad válida mayor a 0.");
        return;
      }

      let datos;

      if (esModoActualizar) {
        // Modo actualizar stock existente
        const medicamentoId = selectMedicamento.value;
        if (!medicamentoId) {
          alert("Por favor seleccione un medicamento existente.");
          return;
        }

        const medicamento = inventarioActual.find(m => m.id == medicamentoId);
        if (!medicamento) {
          alert("Medicamento no encontrado.");
          return;
        }

        datos = {
          id: medicamentoId,
          cantidad: cantidad, // Cantidad a agregar
          actualizar: true
        };
      } else {
        // Modo nuevo medicamento
        const nombre = document.getElementById("nombreInv").value.trim();
        const consumo_por_dosis = parseInt(document.getElementById("consumoInv").value, 10);

        if (!nombre || isNaN(consumo_por_dosis) || consumo_por_dosis < 1) {
          alert("Por favor complete todos los campos correctamente.");
          return;
        }

        datos = { nombre, cantidad, consumo_por_dosis };
      }

      try {
        const resp = await fetch("http://localhost:3000/inventario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });

        const resultado = await resp.json();
        alert(resultado.mensaje || (esModoActualizar ? "Stock actualizado correctamente." : "Medicamento agregado al inventario."));
        await cargarInventario();
        await verificarAlertasStock();
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
      inventarioActual = data;
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
    modoActualizarCheckbox.checked = false;
    selectMedicamentoRow.style.display = "none";
    inputNombreRow.style.display = "block";
    consumoRow.style.display = "block";
    selectMedicamento.value = "";
  }

  cargarInventario();
  verificarAlertasStock();

})();

// ===============================
// ALERTAS DE STOCK BAJO
// ===============================
async function verificarAlertasStock() {
  try {
    const response = await fetch("http://localhost:3000/inventario");
    if (!response.ok) throw new Error('Error al cargar inventario');

    const inventario = await response.json();
    console.log('Inventario cargado para alertas:', inventario);

    const alertas = inventario.filter(item => {
      const cantidad = item.cantidad || 0;
      // Considerar stock bajo si cantidad <= 10 (puedes ajustar este umbral)
      return cantidad <= 10;
    });

    mostrarAlertasStock(alertas);
  } catch (error) {
    console.error('Error al verificar stock:', error);
    mostrarAlertasStock([]);
  }
}

function mostrarAlertasStock(alertas) {
  const container = document.getElementById('alertasStock');
  if (!container) {
    console.error('Contenedor #alertasStock no encontrado');
    return;
  }

  container.innerHTML = '';

  if (alertas.length === 0) {
    container.innerHTML = '<div class="list-group-item text-center text-muted">No hay alertas de stock bajo</div>';
    return;
  }

  alertas.forEach(item => {
    const cantidad = item.cantidad || 0;
    const nivel = cantidad === 0 ? 'danger' : cantidad <= 5 ? 'danger' : 'warning';
    const icono = cantidad === 0 ? 'exclamation-triangle-fill' : 'exclamation-triangle';
    const mensaje = cantidad === 0 ? 'AGOTADO' : 'Stock Bajo';

    const itemDiv = document.createElement('div');
    itemDiv.className = `list-group-item list-group-item-${nivel}`;
    itemDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">
            <i class="bi bi-${icono} me-2"></i>
            ${escapeHtml(item.nombre)}
          </h6>
          <p class="mb-1">Cantidad actual: <strong>${cantidad}</strong> unidades</p>
          <small class="text-muted">Última actualización: ${new Date(item.fecha_registro).toLocaleString()}</small>
        </div>
        <div class="text-end">
          <span class="badge bg-${nivel}">${mensaje}</span>
        </div>
      </div>
    `;
    container.appendChild(itemDiv);
  });
}

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
        alert(resultado.mensaje || "Ficha médica guardada correctamente.");
        alergias.length = 0;
        condiciones.length = 0;
        renderList(listaAlergias, []);
        renderCondiciones();
        alertaCritica.classList.add("oculto");
        document.getElementById("nombreFicha").value = "";
        document.getElementById("fechaNac").value = "";
      } else {
        alert("Error: " + (resultado.mensaje || "No se pudo guardar la ficha."));
      }

    } catch (error) {
      console.error("Error al enviar ficha médica:", error);
      alert("Error de conexión con el servidor.");
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
// MÓDULO DE CITAS MÉDICAS (SIN NOTIFICACIONES)
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

  if (!formCita) return;

  let citas = [];

  cargarCitasDesdeServidor();

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
      }
    } catch (error) {
      console.error("Error al cargar citas:", error);
    }
  }

  function combinarFechaHora(fechaStr, horaStr) {
    if (!fechaStr || !horaStr) return null;
    return new Date(`${fechaStr}T${horaStr}:00`);
  }

  function formatearFechaHora(date) {
    if (!(date instanceof Date)) return '';
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function esPasada(date) {
    return date.getTime() <= Date.now();
  }

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
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
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

    const proximas = citas.filter(c => new Date(c.datetime) > new Date());
    if (proximas.length === 0) {
      resumenEl.textContent = 'No hay citas futuras.';
    } else {
      resumenEl.textContent = `Próxima cita: ${formatearFechaHora(new Date(proximas[0].datetime))} — ${proximas[0].motivo}`;
    }
  }

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
        alert(data.mensaje || 'Cita guardada correctamente');
        formCita.reset();
        anticipacionInput.value = '60';
        cargarCitasDesdeServidor();
      } else {
        alert('Error: ' + data.mensaje);
      }

    } catch (error) {
      console.error('Error al enviar la cita:', error);
      alert('Error al conectar con el servidor.');
    }
  }

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

  formCita.addEventListener('submit', agregarCitaDesdeFormulario);
  limpiarCitaBtn.addEventListener('click', () => formCita.reset());
  borrarTodasCitasBtn.addEventListener('click', borrarTodasCitas);

})();

// ===============================
// MÓDULO DE CHECKLIST CORREGIDO
// Contiene HU-32: Eliminación segura de medicamentos
// Funciones: Cargar pacientes desde BD, cargar datos del día, confirmar toma,
//   eliminar medicamento con modal (HU-32), limpiar día, exportar CSV
// ===============================
(function(){
  const patientInput = document.getElementById("patientInput");
  const dateInput = document.getElementById("dateInput");
  const loadBtn = document.getElementById("loadBtn");
  const medListEl = document.getElementById("medList");
  const statusMsg = document.getElementById("statusMsg");
  const addSampleBtn = document.getElementById("addSampleBtn");
  const clearDayBtn = document.getElementById("clearDayBtn");
  const auditList = document.getElementById("auditList");
  const exportCsvBtn = document.getElementById("exportCsvBtn");

  if (!patientInput) return;

  const sampleMeds = [
    { id: 1, name: "Paracetamol 500 mg", dose: "1 tableta", schedule: "08:00" },
    { id: 2, name: "Vitamina D 1000 UI", dose: "1 cápsula", schedule: "12:00" },
    { id: 3, name: "Ibuprofeno 200 mg", dose: "1 tableta", schedule: "20:00" }
  ];

  let meds = [];
  let checks = {};
  let currentPatientKey = null;
  let currentDateStr = null;

  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  // Cargar pacientes desde la BD al select
  async function cargarPacientesChecklist() {
    try {
      const resp = await fetch('http://localhost:3000/pacientes');
      const pacientes = await resp.json();
      patientInput.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
      pacientes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = `${p.id_paciente} - ${p.nombre_completo}`;
        opt.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        patientInput.appendChild(opt);
      });
    } catch (err) {
      console.error('Error al cargar pacientes en checklist:', err);
    }
  }

  // Cargar pacientes al inicio y cuando se muestra la sección
  cargarPacientesChecklist();
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.section === 'checklist') cargarPacientesChecklist();
    });
  });

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const formatTime = iso => (iso ? new Date(iso).toLocaleTimeString() : "—");

  const setStatus = (text, type = 'info') => {
    if (!statusMsg) return;
    statusMsg.textContent = text || "";
    statusMsg.className = `alert alert-${type} mt-3`;
    statusMsg.classList.toggle('d-none', !text);
  };

  const renderMeds = () => {
    if (!medListEl) return;
    medListEl.innerHTML = "";
    
    if (meds.length === 0) {
      medListEl.innerHTML = `<div class="text-center text-muted p-4">No hay medicamentos. Carga ejemplos o añade medicamentos.</div>`;
      return;
    }

    meds.forEach(m => {
      const info = checks[m.id];
      const taken = info && info.taken;
      
      const item = document.createElement("div");
      item.className = `list-group-item d-flex justify-content-between align-items-center ${taken ? 'bg-light' : ''}`;
      
      item.innerHTML = `
        <div class="me-3 flex-grow-1">
          <div><strong>${escapeHtml(m.name)}</strong></div>
          <div class="small text-muted">${escapeHtml(m.dose || "")} ${m.schedule ? "• " + m.schedule : ""}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="text-end" style="min-width:140px">
            <div class="mb-1">
              <input type="checkbox" class="form-check-input me-2" id="chk_${m.id}" ${taken ? "checked" : ""}>
              <label for="chk_${m.id}" class="form-check-label small">Tomado</label>
            </div>
            <div>
              <span class="badge bg-secondary">${info && info.takenAt ? formatTime(info.takenAt) : "—"}</span>
              ${info && info.actor ? `<span class="badge bg-info">${escapeHtml(info.actor)}</span>` : ''}
            </div>
          </div>
          <button class="btn btn-outline-danger btn-sm eliminar-med-btn" data-med-id="${m.id}" data-med-name="${escapeHtml(m.name)}" data-med-dose="${escapeHtml(m.dose || '')}" data-med-schedule="${m.schedule || ''}" title="Eliminar medicamento">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      
      medListEl.appendChild(item);

      const cb = item.querySelector(`#chk_${m.id}`);
      cb.addEventListener("change", async () => {
        const actor = prompt(
          "¿Quién confirma la toma?",
          (checks[m.id] && checks[m.id].actor) || patientInput.value || "Paciente"
        );
        
        if (cb.checked) {
          checks[m.id] = {
            taken: true,
            takenAt: new Date().toISOString(),
            actor: actor || "Paciente"
          };
          await guardarCheckEnServidor(m.id);
        } else {
          delete checks[m.id];
          await eliminarCheckEnServidor(m.id);
        }
        
        renderMeds();
        renderAudit();
      });

      // HU-32: Botón eliminar medicamento del tratamiento
      // Abre modal de confirmación, elimina med + confirmaciones, actualiza inventario
      const delBtn = item.querySelector('.eliminar-med-btn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          const medId = delBtn.dataset.medId;
          const medName = delBtn.dataset.medName;
          const medDose = delBtn.dataset.medDose;
          const medSchedule = delBtn.dataset.medSchedule;

          const elimNombre = document.getElementById('elimMedNombre');
          const elimDetalle = document.getElementById('elimMedDetalle');
          const confirmarBtn = document.getElementById('confirmarEliminarMedBtn');

          if (elimNombre) elimNombre.textContent = medName;
          if (elimDetalle) elimDetalle.textContent = `${medDose} ${medSchedule ? '• ' + medSchedule : ''}`;

          const modalEl = document.getElementById('modalEliminarMed');
          const modal = new bootstrap.Modal(modalEl);
          modal.show();

          // Remover listener previo para evitar duplicados
          const nuevoBtn = confirmarBtn.cloneNode(true);
          confirmarBtn.parentNode.replaceChild(nuevoBtn, confirmarBtn);

          nuevoBtn.addEventListener('click', async () => {
            nuevoBtn.disabled = true;
            nuevoBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Eliminando...';

            try {
              const resp = await fetch(
                `http://localhost:3000/eliminarMedicamentoChecklist/${encodeURIComponent(currentPatientKey)}/${currentDateStr}/${medId}`,
                { method: 'DELETE' }
              );
              const data = await resp.json();

              if (resp.ok) {
                // Quitar de la lista local
                meds = meds.filter(med => med.id !== parseInt(medId));
                delete checks[medId];
                setStatus(`✅ ${medName} eliminado del tratamiento. ${data.inventario_actualizado ? 'Inventario actualizado.' : ''}`, 'success');
                renderMeds();
                renderAudit();
              } else {
                setStatus('❌ ' + (data.mensaje || 'Error al eliminar'), 'danger');
              }
            } catch (err) {
              console.error('Error al eliminar medicamento:', err);
              setStatus('❌ Error de conexión al eliminar', 'danger');
            }

            modal.hide();
          });
        });
      }
    });
  };

  const guardarCheckEnServidor = async (medId) => {
    if (!currentPatientKey || !currentDateStr) return;
    
    const checkData = checks[medId];
    if (!checkData) return;

    try {
      const resp = await fetch('http://localhost:3000/guardarChecklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: currentPatientKey,
          fecha: currentDateStr,
          medicamento_id: medId,
          medicamento_nombre: meds.find(m => m.id === medId)?.name || '',
          tomado: checkData.taken,
          hora_toma: checkData.takenAt,
          actor: checkData.actor
        })
      });

      const data = await resp.json();
      setStatus(data.mensaje || 'Guardado correctamente', 'success');
    } catch (error) {
      console.error('Error al guardar check:', error);
      setStatus('Error al guardar en el servidor', 'danger');
    }
  };

  const eliminarCheckEnServidor = async (medId) => {
    if (!currentPatientKey || !currentDateStr) return;

    try {
      const resp = await fetch(`http://localhost:3000/eliminarChecklist/${currentPatientKey}/${currentDateStr}/${medId}`, {
        method: 'DELETE'
      });

      const data = await resp.json();
      setStatus(data.mensaje || 'Eliminado', 'warning');
    } catch (error) {
      console.error('Error al eliminar check:', error);
    }
  };

  const renderAudit = () => {
    if (!auditList) return;
    auditList.innerHTML = "";
    
    const items = Object.entries(checks)
      .filter(([, v]) => v && v.taken)
      .map(([id, v]) => ({ medId: +id, takenAt: v.takenAt, actor: v.actor }))
      .sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));

    if (!items.length) {
      auditList.innerHTML = '<li class="text-muted">Sin acciones registradas hoy.</li>';
      return;
    }

    items.forEach(it => {
      const med = meds.find(m => m.id === it.medId);
      const li = document.createElement("li");
      li.className = 'mb-2';
      li.innerHTML = `
        <strong>${escapeHtml(med ? med.name : "ID " + it.medId)}</strong><br>
        <small class="text-muted">${formatTime(it.takenAt)} por ${escapeHtml(it.actor)}</small>
      `;
      auditList.appendChild(li);
    });
  };

  const cargarDatosDesdeServidor = async () => {
    const p = (patientInput.value || "").trim();
    const d = dateInput.value;
    
    if (!p) {
      alert("Completa paciente ID / Nombre");
      return;
    }
    if (!d) {
      alert("Selecciona una fecha");
      return;
    }

    currentPatientKey = p;
    currentDateStr = d;

    try {
      const resp = await fetch(`http://localhost:3000/obtenerChecklist/${p}/${d}`);
      const data = await resp.json();
      
      if (data && data.meds) {
        meds = data.meds;
        checks = data.checks || {};
        setStatus("Datos cargados correctamente", 'success');
      } else {
        meds = [];
        checks = {};
        setStatus("No hay datos guardados para esta fecha", 'warning');
      }
      
      renderMeds();
      renderAudit();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setStatus('Error al conectar con el servidor', 'danger');
    }
  };

  if (loadBtn) {
    loadBtn.addEventListener("click", cargarDatosDesdeServidor);
  }

  if (addSampleBtn) {
    addSampleBtn.addEventListener("click", async () => {
      const p = (patientInput.value || "").trim();
      const d = dateInput.value;
      
      if (!p) {
        alert("Completa paciente ID / Nombre");
        return;
      }
      if (!d) {
        alert("Selecciona una fecha");
        return;
      }

      // Confirmar si ya hay medicamentos cargados
      if (meds.length > 0) {
        if (!confirm("Ya hay medicamentos cargados. ¿Deseas reemplazarlos con los ejemplos?")) {
          return;
        }
      }

      currentPatientKey = p;
      currentDateStr = d;
      
      // Limpiar todo primero
      meds = [];
      checks = {};
      
      // Cargar medicamentos de ejemplo
      meds = JSON.parse(JSON.stringify(sampleMeds));
      
      try {
        // Primero limpiar el día en el servidor
        await fetch(`http://localhost:3000/limpiarDiaChecklist/${currentPatientKey}/${currentDateStr}`, {
          method: 'DELETE'
        });
        
        // Luego guardar los nuevos medicamentos
        const resp = await fetch('http://localhost:3000/guardarMedicamentosChecklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: currentPatientKey,
            fecha: currentDateStr,
            medicamentos: meds
          })
        });
        
        const data = await resp.json();
        setStatus(data.mensaje || "Medicamentos de ejemplo cargados", 'success');
        renderMeds();
        renderAudit();
      } catch (error) {
        console.error('Error:', error);
        // Si falla el servidor, al menos mostrar los datos localmente
        setStatus('Medicamentos cargados localmente (sin conexión al servidor)', 'warning');
        renderMeds();
        renderAudit();
      }
    });
  }

  if (clearDayBtn) {
    clearDayBtn.addEventListener("click", async () => {
      if (!currentPatientKey || !currentDateStr) {
        return alert("Carga primero paciente y fecha.");
      }
      if (!confirm("¿Seguro que quieres limpiar todo el día?")) return;
      
      try {
        await fetch(`http://localhost:3000/limpiarDiaChecklist/${currentPatientKey}/${currentDateStr}`, {
          method: 'DELETE'
        });
        
        checks = {};
        setStatus("Día limpiado correctamente", 'success');
        renderMeds();
        renderAudit();
      } catch (error) {
        console.error('Error:', error);
        setStatus('Error al limpiar', 'danger');
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      if (!currentPatientKey || !currentDateStr) {
        return alert("Carga primero paciente y fecha.");
      }
      
      const rows = [
        ["medicationId", "name", "dose", "schedule", "taken", "takenAt", "actor"]
      ];
      
      meds.forEach(m => {
        const i = checks[m.id];
        rows.push([
          m.id,
          `"${m.name}"`,
          `"${m.dose || ""}"`,
          m.schedule || "",
          i && i.taken ? "true" : "false",
          i && i.takenAt ? i.takenAt : "",
          i && i.actor ? `"${i.actor}"` : ""
        ]);
      });
      
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `checklist_${currentPatientKey}_${currentDateStr}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
})();


// ===============================
// MÓDULO DE PEDIDOS A FARMACIAss
// ===============================
(function(){
  const openBtn = document.getElementById('open-create-order');
  const modalEl = document.getElementById('createOrderModal');
  const detailModalEl = document.getElementById('detailModal');
  
  if (!openBtn || !modalEl) return;

  const modal = new bootstrap.Modal(modalEl);
  const detailModal = new bootstrap.Modal(detailModalEl);
  
  const historyList = document.getElementById('historyList');
  const clearAllBtn = document.getElementById('clearAll');
  const itemsTableBody = document.querySelector('#itemsTable tbody');
  const addEmptyRowBtn = document.getElementById('addEmptyRow');
  const farmaciaSelect = document.getElementById('farmaciaSelect');
  const notasInput = document.getElementById('notas');
  const previewBtn = document.getElementById('previewBtn');
  const sendBtn = document.getElementById('sendBtn');
  const previewContent = document.getElementById('previewContent');
  const formMessage = document.getElementById('formMessage');
  const detailBody = document.getElementById('detailBody');

  openBtn.onclick = () => modal.show();
  addEmptyRowBtn.onclick = () => addRow();

  function addRow(){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="form-control form-control-sm txt-name" placeholder="Medicamento"></td>
      <td><input class="form-control form-control-sm txt-dose" placeholder="Dosis (ej: 500mg)"></td>
      <td><input type="number" class="form-control form-control-sm num" min="0" value="1"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger">✕</button></td>`;
    tr.querySelector('button').onclick = ()=>tr.remove();
    itemsTableBody.appendChild(tr);
  }

  previewBtn.onclick = async ()=>{
    const o = await buildOrder();
    if(!o)return;
    previewContent.textContent = JSON.stringify(o,null,2);
  };

  sendBtn.onclick = async ()=>{
    const o = await buildOrder();
    if(!o)return;
    
    console.log('Enviando pedido:', o);
    
    try {
      const resp = await fetch('http://localhost:3000/guardarPedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o)
      });

      console.log('Respuesta del servidor:', resp.status);

      if (!resp.ok) {
        const data = await resp.json();
        console.error('Error del servidor:', data);
        showMsg('Error: ' + (data.mensaje || 'Error desconocido'), 'text-danger');
        return;
      }

      const data = await resp.json();
      console.log('Respuesta exitosa:', data);
      showMsg('Pedido guardado correctamente','text-success');
      
      setTimeout(()=>{
        modal.hide(); 
        resetForm();
        cargarHistorial();
      },1000);
      
    } catch (error) {
      console.error('Error completo:', error);
      showMsg('Error al conectar: ' + error.message, 'text-danger');
    }
  };

  async function buildOrder(){
    const farmacia = farmaciaSelect.value.trim();
    if(!farmacia) {
      showMsg('Seleccione una farmacia','text-danger');
      return null;
    }
    
    const allItems = [...itemsTableBody.querySelectorAll('tr')].map(r => {
      const nombre = r.querySelector('.txt-name').value.trim();
      const dosisRaw = r.querySelector('.txt-dose').value.trim();
      const cantidad = parseInt(r.querySelector('.num').value, 10);
      
      return {
        nombre: nombre,
        dosis: dosisRaw || 'No especificada',
        cantidad: cantidad
      };
    });
    
    const items = allItems.filter(i => i.nombre && i.cantidad > 0);
    
    if(!items.length) {
      showMsg('Debe agregar al menos un medicamento','text-danger');
      return null;
    }
    
    const itemsIncompletos = items.filter(i => !i.dosis);
    if(itemsIncompletos.length > 0) {
      showMsg('Todos los medicamentos deben tener dosis especificada','text-danger');
      return null;
    }
    
    clearMsg();
    
    const now = new Date();
    const fecha_mysql = now.toISOString().slice(0, 19).replace('T', ' ');
    
    return {
      id: 'P-'+Date.now().toString(36),
      farmacia,
      items,
      notas: notasInput.value.trim(),
      estado: 'Pendiente',
      fecha_creacion: fecha_mysql,
      id_usuario: 1
    };
  }

  function showMsg(msg,cls){
    formMessage.className='fw-semibold '+cls;
    formMessage.textContent=msg;
  }
  
  function clearMsg(){
    formMessage.textContent='';
  }
  
  function resetForm(){
    itemsTableBody.innerHTML='';
    farmaciaSelect.value='';
    notasInput.value='';
    previewContent.textContent='Aún no hay previsualización.';
    clearMsg();
  }

  async function cargarHistorial(){
    try {
      const resp = await fetch('http://localhost:3000/obtenerPedidos');
      const data = await resp.json();
      renderHistory(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }

  function renderHistory(list){
    historyList.innerHTML='';
    
    if(!list || !list.length){
      historyList.innerHTML='<div class="text-muted small">No hay pedidos guardados.</div>';
      return;
    }
    
    list.forEach(o=>{
      const div=document.createElement('div');
      div.className='border rounded p-2 bg-white d-flex justify-content-between align-items-center mb-2';
      div.innerHTML=`
        <div>
          <strong>${escapeHtml(o.id)}</strong><br>
          <small>${new Date(o.fecha_creacion).toLocaleString()} — ${escapeHtml(o.farmacia)}</small><br>
          <small>${o.total_items} ítem(s) — ${escapeHtml(o.estado)}</small>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-secondary me-2 btn-ver">Ver</button>
          <button class="btn btn-sm btn-outline-danger btn-del">Eliminar</button>
        </div>`;
      
      const viewBtn = div.querySelector('.btn-ver');
      const delBtn = div.querySelector('.btn-del');
      
      viewBtn.onclick = () => showDetail(o.id);
      delBtn.onclick = () => {
        if(confirm('¿Eliminar este pedido?')){
          eliminarPedido(o.id);
        }
      };
      
      historyList.appendChild(div);
    });
  }

  async function showDetail(pedidoId){
    try {
      const resp = await fetch(`http://localhost:3000/obtenerPedido/${pedidoId}`);
      const data = await resp.json();
      
      if (data.pedido && data.items) {
        const o = data.pedido;
        const items = data.items;
        
        detailBody.innerHTML=`
          <p><strong>ID:</strong> ${escapeHtml(o.id)}</p>
          <p><strong>Farmacia:</strong> ${escapeHtml(o.farmacia)}</p>
          <p><strong>Fecha:</strong> ${new Date(o.fecha_creacion).toLocaleString()}</p>
          <p><strong>Estado:</strong> <span class="badge bg-info">${escapeHtml(o.estado)}</span></p>
          <h6>Medicamentos</h6>
          <ul>${items.map(i=>`<li>${escapeHtml(i.nombre_medicamento)} — ${escapeHtml(i.dosis)} — x${i.cantidad}</li>`).join('')}</ul>
          <p><strong>Notas:</strong> ${escapeHtml(o.notas)||'(sin notas)'}</p>`;
        
        detailModal.show();
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      alert('Error al cargar el detalle del pedido');
    }
  }

  async function eliminarPedido(pedidoId){
    try {
      const resp = await fetch(`http://localhost:3000/eliminarPedido/${pedidoId}`, {
        method: 'DELETE'
      });
      
      const data = await resp.json();
      
      if (resp.ok) {
        alert(data.mensaje || 'Pedido eliminado');
        cargarHistorial();
      } else {
        alert('Error: ' + data.mensaje);
      }
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      alert('Error al conectar con el servidor');
    }
  }

  clearAllBtn.onclick = async () => {
    if(!confirm('¿Borrar todo el historial?')) return;

    try {
      const resp = await fetch('http://localhost:3000/eliminarTodosPedidos', {
        method: 'DELETE'
      });

      const data = await resp.json();

      if (resp.ok) {
        alert(data.mensaje || 'Historial limpiado');
        cargarHistorial();
      } else {
        alert('Error: ' + data.mensaje);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al conectar con el servidor');
    }
  };

  cargarHistorial();
})();

// ===============================
// GESTIÓN DE USUARIOS
// ===============================
(function(){
  const abrirModalUsuarioBtn = document.getElementById('abrirModalUsuario');
  const modalUsuarioEl = document.getElementById('modalUsuario');
  const guardarUsuarioBtn = document.getElementById('guardarUsuarioBtn');
  const tablaUsuarios = document.querySelector('#tablaUsuarios tbody');

  let modalUsuario = null;
  let editingUserId = null;

  if (modalUsuarioEl) {
    modalUsuario = new bootstrap.Modal(modalUsuarioEl);
  }

  if (abrirModalUsuarioBtn) {
    abrirModalUsuarioBtn.addEventListener('click', () => {
      editingUserId = null;
      limpiarFormUsuario();
      modalUsuario.show();
    });
  }

  if (guardarUsuarioBtn) {
    guardarUsuarioBtn.addEventListener('click', async () => {
      const nombres = document.getElementById('nombresUsuario').value.trim();
      const apellidos = document.getElementById('apellidosUsuario').value.trim();
      const identidad = document.getElementById('identidadUsuario').value.trim();
      const telefono = document.getElementById('telefonoUsuario').value.trim();
      const email = document.getElementById('emailUsuario').value.trim();
      const password = document.getElementById('passwordUsuario').value;
      const rol = document.getElementById('rolUsuario').value;

      if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
        alert('Por favor complete todos los campos.');
        return;
      }

      const datos = { nombres, apellidos, identidad, telefono, email, password, rol };

      try {
        let resp;
        if (editingUserId) {
          // Actualizar usuario existente
          resp = await fetch(`http://localhost:3000/usuarios/${editingUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
          });
        } else {
          // Crear nuevo usuario
          resp = await fetch('http://localhost:3000/registraradm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
          });
        }

        const resultado = await resp.json();
        if (resp.ok) {
          alert(resultado.mensaje || 'Usuario guardado correctamente.');
          modalUsuario.hide();
          cargarUsuarios();
        } else {
          alert('Error: ' + (resultado.error || resultado.mensaje));
        }
      } catch (error) {
        console.error('Error al guardar usuario:', error);
        alert('No se pudo conectar con el servidor.');
      }
    });
  }

  async function cargarUsuarios() {
    try {
      const respuesta = await fetch('http://localhost:3000/usuarios');
      const data = await respuesta.json();
      renderUsuarios(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  }

  function renderUsuarios(usuarios) {
    const tablaUsuarios = document.querySelector('#tablaUsuarios tbody');
    const noUsuarios = document.getElementById('noUsuarios');

    if (!tablaUsuarios) return;

    tablaUsuarios.innerHTML = '';

    if (usuarios.length === 0) {
      noUsuarios.classList.remove('d-none');
      return;
    }

    noUsuarios.classList.add('d-none');

    usuarios.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-semibold">${escapeHtml(user.nombres)}</td>
        <td class="fw-semibold">${escapeHtml(user.apellidos)}</td>
        <td><code class="text-muted">${escapeHtml(user.identidad)}</code></td>
        <td>${escapeHtml(user.telefono)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><code class="text-danger font-monospace">${escapeHtml(user.password)}</code></td>
        <td><span class="badge bg-${getRolBadgeClass(user.rol)}">${escapeHtml(user.rol)}</span></td>
        <td class="text-center">
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(${user.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${user.id})" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tablaUsuarios.appendChild(tr);
    });
  }

  function getRolBadgeClass(rol) {
    const classes = {
      'paciente': 'primary',
      'cuidador': 'success',
      'farmacia': 'info',
      'administrador': 'warning'
    };
    return classes[rol] || 'secondary';
  }

  window.editarUsuario = async function(id) {
    try {
      const respuesta = await fetch('http://localhost:3000/usuarios');
      const usuarios = await respuesta.json();
      const user = usuarios.find(u => u.id === id);

      if (user) {
        editingUserId = id;
        document.getElementById('nombresUsuario').value = user.nombres;
        document.getElementById('apellidosUsuario').value = user.apellidos;
        document.getElementById('identidadUsuario').value = user.identidad;
        document.getElementById('telefonoUsuario').value = user.telefono;
        document.getElementById('emailUsuario').value = user.email;
        document.getElementById('passwordUsuario').value = user.password; // Mostrar password para editar
        document.getElementById('rolUsuario').value = user.rol;
        modalUsuario.show();
      }
    } catch (error) {
      console.error('Error al cargar usuario para editar:', error);
    }
  };

  window.eliminarUsuario = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) return;

    try {
      const resp = await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: 'DELETE'
      });

      const resultado = await resp.json();
      if (resp.ok) {
        alert(resultado.mensaje || 'Usuario eliminado correctamente.');
        cargarUsuarios();
      } else {
        alert('Error: ' + resultado.mensaje);
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('No se pudo conectar con el servidor.');
    }
  };

  function limpiarFormUsuario() {
    document.getElementById('nombresUsuario').value = '';
    document.getElementById('apellidosUsuario').value = '';
    document.getElementById('identidadUsuario').value = '';
    document.getElementById('telefonoUsuario').value = '';
    document.getElementById('emailUsuario').value = '';
    document.getElementById('passwordUsuario').value = '';
    document.getElementById('rolUsuario').value = '';
  }

  // Cargar usuarios al iniciar
  cargarUsuarios();
})();

// ===============================
// PANEL CONSOLIDADO DE PACIENTES (CUIDADOR) - HU-26
// Funciones: Listar pacientes por cuidador, filtrar por estatus de salud,
//   filtrar alertas por estado/fecha, tabla de detalle de alertas
// ===============================
(function () {
  const API_BASE = 'http://localhost:3000';

  function normalizeDatetimeLocal(value) {
    // Convierte "YYYY-MM-DDTHH:mm" a "YYYY-MM-DD HH:mm:00" (sin timezone)
    if (!value) return '';
    return value.replace('T', ' ') + ':00';
  }

  function getStatusLabel(estatus) {
    const map = {
      critico: 'Crítico',
      importante: 'Importante',
      normal: 'Normal',
      leve: 'Leve'
    };
    return map[String(estatus || '').toLowerCase()] || 'Sin clasificar';
  }

  function getStatusBadgeClass(estatus) {
    const key = String(estatus || '').toLowerCase();
    if (key === 'critico') return 'danger';
    if (key === 'importante') return 'warning';
    if (key === 'normal') return 'primary';
    if (key === 'leve') return 'success';
    return 'secondary';
  }

  function getAlertStateLabel(estado) {
    const key = String(estado || '').toLowerCase();
    if (key === 'pendiente') return 'Pendiente';
    if (key === 'atendida') return 'Atendida';
    return 'Desconocido';
  }

  function getAlertStateBadgeClass(estado) {
    const key = String(estado || '').toLowerCase();
    if (key === 'pendiente') return 'danger';
    if (key === 'atendida') return 'success';
    return 'secondary';
  }

  async function fetchJson(url) {
    const resp = await fetch(url);
    const data = await resp.json();
    return { resp, data };
  }

  function renderEmpty(panelContenido, panelTabla, text) {
    if (panelContenido) panelContenido.innerHTML = '';
    if (panelTabla) {
      panelTabla.innerHTML = `
        <div class="card">
          <div class="text-center text-muted p-4">${escapeHtml(text)}</div>
        </div>
      `;
    }
  }

  function groupPatientsByStatus(pacientes) {
    const groups = { critico: [], importante: [], normal: [], leve: [], other: [] };
    pacientes.forEach(p => {
      const key = String(p.estatus_salud || '').toLowerCase();
      if (groups[key]) groups[key].push(p);
      else groups.other.push(p);
    });
    return groups;
  }

  function hasActiveAlertFilters({ estado, desde, hasta }) {
    return (estado && estado !== 'todas') || Boolean(desde) || Boolean(hasta);
  }

  function buildAlertsByPatient(alertas) {
    const map = new Map();
    (alertas || []).forEach(a => {
      const pid = a.paciente_id;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(a);
    });
    return map;
  }

  function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return String(value);
    }
    return d.toLocaleString();
  }

  function renderPanel(panelContenido, panelTabla, panelMsg, pacientes, alertas, filters) {
    const alertasPorPaciente = buildAlertsByPatient(alertas);
    const filtrosAlertasActivos = hasActiveAlertFilters(filters);

    let pacientesMostrados = pacientes;
    if (filtrosAlertasActivos) {
      pacientesMostrados = pacientes.filter(p => {
        const list = alertasPorPaciente.get(p.id_paciente) || [];
        return list.length > 0;
      });
    }

    const totalAlertas = pacientesMostrados.reduce((acc, p) => {
      return acc + ((alertasPorPaciente.get(p.id_paciente) || []).length);
    }, 0);

    panelMsg.textContent = `${pacientesMostrados.length} paciente(s) · ${totalAlertas} alerta(s)`;

    if (!pacientesMostrados.length) {
      renderEmpty(panelContenido, panelTabla, filtrosAlertasActivos ? 'No hay pacientes con alertas para los filtros seleccionados.' : 'No hay pacientes asignados para mostrar.');
      return;
    }

    // Tarjetas no requeridas: solo tabla
    if (panelContenido) panelContenido.innerHTML = '';

    // Tabla detalle (alertas filtradas)
    const pacientesById = new Map();
    pacientesMostrados.forEach(p => pacientesById.set(p.id_paciente, p));

    const alertasDetalle = Array.isArray(alertas) ? alertas : [];
    const rowsHtml = alertasDetalle.length
      ? alertasDetalle.map(a => {
          const p = pacientesById.get(a.paciente_id) || {};
          const est = String(p.estatus_salud || '').toLowerCase();
          return `
            <tr>
              <td class="fw-semibold">${escapeHtml(p.nombre_completo || `Paciente ${a.paciente_id}`)}</td>
              <td><span class="badge bg-${getStatusBadgeClass(est)}">${escapeHtml(getStatusLabel(est))}</span></td>
              <td>${escapeHtml(a.descripcion || '')}</td>
              <td><span class="badge bg-${getAlertStateBadgeClass(a.estado)}">${escapeHtml(getAlertStateLabel(a.estado))}</span></td>
              <td class="text-muted">${escapeHtml(formatDateTime(a.creado_en))}</td>
            </tr>
          `;
        }).join('')
      : '';

    const tableHtml = `
      <div class="card form-card">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="card-title mb-0"><i class="bi bi-table me-2"></i> Detalle de Alertas</h5>
          <span class="small text-muted">${alertasDetalle.length} registro(s)</span>
        </div>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Estatus</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="5" class="text-center text-muted p-4">No hay alertas para mostrar.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (panelTabla) panelTabla.innerHTML = tableHtml;
  }

  async function loadPanel(panelContenido, panelTabla, panelMsg, filters) {
    const cuidadorId = localStorage.getItem('userId');
    if (!cuidadorId) {
      panelMsg.textContent = '';
      renderEmpty(panelContenido, panelTabla, 'No se encontró el id del cuidador (userId). Vuelve a iniciar sesión.');
      return;
    }

    panelMsg.textContent = 'Cargando...';
    panelContenido.innerHTML = '<div class="text-center text-muted p-4">Cargando...</div>';
    if (panelTabla) panelTabla.innerHTML = '';

    try {
      const { data: pacientesResp } = await fetchJson(`${API_BASE}/cuidador/${encodeURIComponent(cuidadorId)}/pacientes`);
      let pacientes = Array.isArray(pacientesResp) ? pacientesResp : [];

      const estatusFiltro = String(filters.estatus || 'todas').toLowerCase();
      if (estatusFiltro && estatusFiltro !== 'todas') {
        pacientes = pacientes.filter(p => String(p.estatus_salud || '').toLowerCase() === estatusFiltro);
      }

      const qs = new URLSearchParams();
      if (filters.estado) qs.set('estado', filters.estado);
      if (filters.desde) qs.set('desde', filters.desde);
      if (filters.hasta) qs.set('hasta', filters.hasta);

      const { data: alertasResp } = await fetchJson(`${API_BASE}/cuidador/${encodeURIComponent(cuidadorId)}/alertas?${qs.toString()}`);

      if (alertasResp && alertasResp.needsSetup) {
        panelMsg.textContent = 'Panel listo (sin tabla de alertas)';
        renderPanel(panelContenido, panelTabla, panelMsg, pacientes, [], filters);
        return;
      }

      let alertas = alertasResp && alertasResp.ok ? alertasResp.alertas : [];
      alertas = Array.isArray(alertas) ? alertas : [];
      const allowedIds = new Set(pacientes.map(p => p.id_paciente));
      alertas = alertas.filter(a => allowedIds.has(a.paciente_id));

      renderPanel(panelContenido, panelTabla, panelMsg, pacientes, alertas, filters);
    } catch (err) {
      console.error('Error al cargar panel:', err);
      panelMsg.textContent = '';
      renderEmpty(panelContenido, panelTabla, 'No se pudo cargar el panel. Verifica que el servidor esté activo.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const panelContenido = document.getElementById('panelContenido');
    const panelTabla = document.getElementById('panelTabla');
    const panelMsg = document.getElementById('panelMsg');
    const panelEstatus = document.getElementById('panelEstatus');
    const panelEstado = document.getElementById('panelEstado');
    const panelDesde = document.getElementById('panelDesde');
    const panelHasta = document.getElementById('panelHasta');
    const panelAplicar = document.getElementById('panelAplicar');
    const panelLimpiar = document.getElementById('panelLimpiar');

    if (!panelContenido || !panelMsg || !panelEstatus || !panelEstado || !panelDesde || !panelHasta || !panelAplicar || !panelLimpiar) return;

    function currentFilters() {
      return {
        estatus: panelEstatus.value || 'todas',
        estado: panelEstado.value || 'todas',
        desde: normalizeDatetimeLocal(panelDesde.value),
        hasta: normalizeDatetimeLocal(panelHasta.value)
      };
    }

    panelAplicar.addEventListener('click', () => {
      loadPanel(panelContenido, panelTabla, panelMsg, currentFilters());
    });

    panelLimpiar.addEventListener('click', () => {
      panelEstatus.value = 'todas';
      panelEstado.value = 'todas';
      panelDesde.value = '';
      panelHasta.value = '';
      loadPanel(panelContenido, panelTabla, panelMsg, currentFilters());
    });

    // Carga inicial (sin filtros)
    loadPanel(panelContenido, panelTabla, panelMsg, currentFilters());
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
// ESTADÍSTICAS DE SALUD (HU-27)
// Funciones: Gráficos (cumplimiento doughnut, citas pie, condiciones bar),
//   tarjetas resumen, detalle del paciente, exportar CSV, exportar PDF,
//   comparar entre pacientes (tabla + gráfico barras agrupadas), limpiar comparación
// ===============================
(function(){
  const API = "http://localhost:3000";

  // Referencias DOM
  const pacienteSelect = document.getElementById("estPacienteSelect");
  const cargarBtn = document.getElementById("estCargarBtn");
  const exportCsvBtn = document.getElementById("estExportarCsvBtn");
  const exportPdfBtn = document.getElementById("estExportarPdfBtn");
  const resumenDiv = document.getElementById("estResumen");
  const compararSelect = document.getElementById("estCompararSelect");
  const compararBtn = document.getElementById("estCompararBtn");
  const comparacionDiv = document.getElementById("estComparacion");

  const limpiarCompBtn = document.getElementById("estLimpiarCompBtn");

  if (!pacienteSelect) return; // Si la sección no existe, salir

  // Instancias de gráficos para destruir/recrear
  let chartCumplimiento = null;
  let chartCitas = null;
  let chartCondiciones = null;
  let chartComparacion = null;
  let datosActuales = null; // Para exportar

  // ---- Cargar lista de pacientes ----
  async function cargarPacientes() {
    try {
      const resp = await fetch(`${API}/pacientes`);
      const pacientes = await resp.json();

      pacienteSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
      compararSelect.innerHTML = '';

      pacientes.forEach(p => {
        const opt1 = document.createElement("option");
        opt1.value = p.id_paciente;
        opt1.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        pacienteSelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = p.id_paciente;
        opt2.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        compararSelect.appendChild(opt2);
      });
    } catch (err) {
      console.error("Error al cargar pacientes:", err);
    }
  }

  // ---- Ver estadísticas de un paciente ----
  cargarBtn.addEventListener("click", async () => {
    const id = pacienteSelect.value;
    if (!id) {
      alert("Seleccione un paciente.");
      return;
    }

    try {
      const resp = await fetch(`${API}/estadisticas/paciente/${id}`);
      const data = await resp.json();
      datosActuales = data;

      if (!data.paciente) {
        alert("Paciente no encontrado.");
        return;
      }

      // Mostrar resumen
      resumenDiv.classList.remove("d-none");
      exportCsvBtn.disabled = false;
      exportPdfBtn.disabled = false;

      // Tarjetas resumen
      document.getElementById("estCumplimientoPct").textContent = data.cumplimiento.porcentaje + "%";
      document.getElementById("estTotalMeds").textContent = data.medicamentos.length;
      document.getElementById("estTotalCitas").textContent = data.citas.total;
      document.getElementById("estTotalCondiciones").textContent = data.condiciones.length;

      // Color de cumplimiento
      const pctEl = document.getElementById("estCumplimientoPct");
      pctEl.className = "mt-2 mb-0";
      if (data.cumplimiento.porcentaje >= 80) pctEl.classList.add("text-success");
      else if (data.cumplimiento.porcentaje >= 50) pctEl.classList.add("text-warning");
      else pctEl.classList.add("text-danger");

      // ---- Gráfico Cumplimiento (Doughnut) ----
      if (chartCumplimiento) chartCumplimiento.destroy();
      const ctxCump = document.getElementById("chartCumplimiento").getContext("2d");
      const tomados = data.cumplimiento.total_tomados;
      const noTomados = data.cumplimiento.total_programados - tomados;

      chartCumplimiento = new Chart(ctxCump, {
        type: "doughnut",
        data: {
          labels: ["Tomados", "No tomados"],
          datasets: [{
            data: [tomados, noTomados],
            backgroundColor: ["#198754", "#dc3545"],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            title: {
              display: true,
              text: `Cumplimiento: ${data.cumplimiento.porcentaje}% (${tomados}/${data.cumplimiento.total_programados})`
            }
          }
        }
      });

      // ---- Gráfico Citas (Pie) ----
      if (chartCitas) chartCitas.destroy();
      const ctxCitas = document.getElementById("chartCitas").getContext("2d");
      const estadosCitas = { programada: 0, cumplida: 0, cancelada: 0, vencida: 0 };
      data.citas.detalle.forEach(c => { estadosCitas[c.estado] = c.total; });

      chartCitas = new Chart(ctxCitas, {
        type: "pie",
        data: {
          labels: ["Programadas", "Cumplidas", "Canceladas", "Vencidas"],
          datasets: [{
            data: [estadosCitas.programada, estadosCitas.cumplida, estadosCitas.cancelada, estadosCitas.vencida],
            backgroundColor: ["#0d6efd", "#198754", "#dc3545", "#6c757d"],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } }
        }
      });

      // ---- Gráfico Condiciones (Bar) ----
      if (chartCondiciones) chartCondiciones.destroy();
      const ctxCond = document.getElementById("chartCondiciones").getContext("2d");
      const niveles = { Leve: 0, Moderada: 0, "Crítica": 0 };
      data.condiciones.forEach(c => { if(niveles[c.nivel] !== undefined) niveles[c.nivel]++; });

      chartCondiciones = new Chart(ctxCond, {
        type: "bar",
        data: {
          labels: ["Leve", "Moderada", "Crítica"],
          datasets: [{
            label: "Condiciones médicas",
            data: [niveles.Leve, niveles.Moderada, niveles["Crítica"]],
            backgroundColor: ["#ffc107", "#fd7e14", "#dc3545"],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: { legend: { display: false } }
        }
      });

      // ---- Detalle del paciente ----
      const detDiv = document.getElementById("estDetalle");
      let html = `<p><strong>Nombre:</strong> ${escapeHtml(data.paciente.nombre_completo)}</p>`;
      html += `<p><strong>Fecha nacimiento:</strong> ${data.paciente.fecha_nacimiento || "N/A"}</p>`;

      html += `<p class="mt-2 mb-1"><strong>Alergias:</strong></p><ul>`;
      if (data.alergias.length === 0) html += "<li class='text-muted'>Ninguna registrada</li>";
      else data.alergias.forEach(a => { html += `<li>${escapeHtml(a.nombre_alergia)}</li>`; });
      html += "</ul>";

      html += `<p class="mb-1"><strong>Condiciones:</strong></p><ul>`;
      if (data.condiciones.length === 0) html += "<li class='text-muted'>Ninguna registrada</li>";
      else data.condiciones.forEach(c => {
        const badge = c.nivel === "Crítica" ? "bg-danger" : c.nivel === "Moderada" ? "bg-warning text-dark" : "bg-secondary";
        html += `<li>${escapeHtml(c.nombre_condicion)} <span class="badge ${badge}">${c.nivel}</span></li>`;
      });
      html += "</ul>";

      html += `<p class="mb-1"><strong>Medicamentos asignados:</strong></p><ul>`;
      if (data.medicamentos.length === 0) html += "<li class='text-muted'>Ninguno registrado</li>";
      else data.medicamentos.forEach(m => { html += `<li>${escapeHtml(m.nombre)} - ${escapeHtml(m.dosis)} (cada ${m.frecuencia}h)</li>`; });
      html += "</ul>";

      detDiv.innerHTML = html;

    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      alert("Error al obtener estadísticas del paciente.");
    }
  });

  // ---- Exportar CSV ----
  exportCsvBtn.addEventListener("click", () => {
    if (!datosActuales || !datosActuales.paciente) return;
    const d = datosActuales;
    let csv = "Estadísticas de Salud - " + d.paciente.nombre_completo + "\n\n";
    csv += "Métrica,Valor\n";
    csv += `Cumplimiento (%),${d.cumplimiento.porcentaje}\n`;
    csv += `Medicamentos programados,${d.cumplimiento.total_programados}\n`;
    csv += `Medicamentos tomados,${d.cumplimiento.total_tomados}\n`;
    csv += `Total medicamentos asignados,${d.medicamentos.length}\n`;
    csv += `Total citas,${d.citas.total}\n`;
    csv += `Total condiciones,${d.condiciones.length}\n`;
    csv += `Total alergias,${d.alergias.length}\n\n`;

    csv += "Condiciones Médicas\nNombre,Nivel\n";
    d.condiciones.forEach(c => { csv += `${c.nombre_condicion},${c.nivel}\n`; });
    csv += "\nAlergias\nNombre\n";
    d.alergias.forEach(a => { csv += `${a.nombre_alergia}\n`; });
    csv += "\nMedicamentos\nNombre,Dosis,Frecuencia (h)\n";
    d.medicamentos.forEach(m => { csv += `${m.nombre},${m.dosis},${m.frecuencia}\n`; });
    csv += "\nCitas por Estado\nEstado,Total\n";
    d.citas.detalle.forEach(c => { csv += `${c.estado},${c.total}\n`; });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Estadisticas_${d.paciente.nombre_completo.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // ---- Exportar PDF (usando impresión del navegador) ----
  exportPdfBtn.addEventListener("click", () => {
    if (!datosActuales || !datosActuales.paciente) return;
    const d = datosActuales;

    const ventana = window.open("", "_blank");
    ventana.document.write(`
      <html><head><title>Informe - ${escapeHtml(d.paciente.nombre_completo)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; font-size: 20px; }
        h2 { font-size: 16px; margin-top: 18px; color: #555; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .badge-critica { color: #dc3545; font-weight: bold; }
        .badge-moderada { color: #fd7e14; font-weight: bold; }
        .badge-leve { color: #6c757d; }
        .resumen { display: flex; gap: 20px; margin: 10px 0; }
        .resumen div { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; flex: 1; }
        .resumen h3 { margin: 0; font-size: 24px; }
        .resumen small { color: #888; }
      </style></head><body>
      <h1>Informe de Salud: ${escapeHtml(d.paciente.nombre_completo)}</h1>
      <p>Fecha de nacimiento: ${d.paciente.fecha_nacimiento || "N/A"}</p>
      <p>Fecha del informe: ${new Date().toLocaleDateString("es-HN")}</p>

      <div class="resumen">
        <div><h3>${d.cumplimiento.porcentaje}%</h3><small>Cumplimiento</small></div>
        <div><h3>${d.medicamentos.length}</h3><small>Medicamentos</small></div>
        <div><h3>${d.citas.total}</h3><small>Citas</small></div>
        <div><h3>${d.condiciones.length}</h3><small>Condiciones</small></div>
      </div>

      <h2>Condiciones Médicas</h2>
      <table><tr><th>Condición</th><th>Nivel</th></tr>
      ${d.condiciones.length === 0 ? '<tr><td colspan="2">Ninguna</td></tr>' : d.condiciones.map(c => `<tr><td>${escapeHtml(c.nombre_condicion)}</td><td class="badge-${c.nivel.toLowerCase()}">${c.nivel}</td></tr>`).join("")}
      </table>

      <h2>Alergias</h2>
      <table><tr><th>Alergia</th></tr>
      ${d.alergias.length === 0 ? '<tr><td>Ninguna</td></tr>' : d.alergias.map(a => `<tr><td>${escapeHtml(a.nombre_alergia)}</td></tr>`).join("")}
      </table>

      <h2>Medicamentos Asignados</h2>
      <table><tr><th>Nombre</th><th>Dosis</th><th>Frecuencia (h)</th></tr>
      ${d.medicamentos.length === 0 ? '<tr><td colspan="3">Ninguno</td></tr>' : d.medicamentos.map(m => `<tr><td>${escapeHtml(m.nombre)}</td><td>${escapeHtml(m.dosis)}</td><td>${m.frecuencia}</td></tr>`).join("")}
      </table>

      <h2>Citas Médicas</h2>
      <table><tr><th>Estado</th><th>Total</th></tr>
      ${d.citas.detalle.length === 0 ? '<tr><td colspan="2">Sin citas</td></tr>' : d.citas.detalle.map(c => `<tr><td>${c.estado}</td><td>${c.total}</td></tr>`).join("")}
      </table>

      <h2>Cumplimiento de Medicamentos (Checklist)</h2>
      <table>
        <tr><th>Programados</th><td>${d.cumplimiento.total_programados}</td></tr>
        <tr><th>Tomados</th><td>${d.cumplimiento.total_tomados}</td></tr>
        <tr><th>Porcentaje</th><td>${d.cumplimiento.porcentaje}%</td></tr>
      </table>

      <script>window.onload = function(){ window.print(); }<\/script>
      </body></html>
    `);
    ventana.document.close();
  });

  // ---- Comparar entre pacientes ----
  compararBtn.addEventListener("click", async () => {
    const seleccionados = Array.from(compararSelect.selectedOptions).map(o => o.value);

    if (seleccionados.length < 2) {
      alert("Seleccione al menos 2 pacientes para comparar.");
      return;
    }

    try {
      const resp = await fetch(`${API}/estadisticas/comparar?ids=${seleccionados.join(",")}`);
      const data = await resp.json();

      if (!Array.isArray(data) || data.length === 0) {
        alert("No se encontraron datos para estos pacientes.");
        return;
      }

      comparacionDiv.classList.remove("d-none");

      // Tabla comparativa
      const tbody = document.querySelector("#tablaComparacion tbody");
      tbody.innerHTML = "";
      data.forEach(p => {
        const nivelBadge = p.nivel_max === "Crítica" ? "bg-danger" : p.nivel_max === "Moderada" ? "bg-warning text-dark" : "bg-secondary";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(p.nombre_completo)}</strong></td>
          <td>${p.total_medicamentos}</td>
          <td>${p.total_condiciones}</td>
          <td>${p.total_alergias}</td>
          <td>${p.total_citas}</td>
          <td>${p.citas_cumplidas || 0}</td>
          <td>${p.citas_canceladas || 0}</td>
          <td><span class="badge ${nivelBadge}">${p.nivel_max || "N/A"}</span></td>
        `;
        tbody.appendChild(tr);
      });

      // Gráfico comparativo (barras agrupadas)
      if (chartComparacion) chartComparacion.destroy();
      const ctx = document.getElementById("chartComparacion").getContext("2d");

      chartComparacion = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.map(p => p.nombre_completo),
          datasets: [
            {
              label: "Medicamentos",
              data: data.map(p => p.total_medicamentos),
              backgroundColor: "#0d6efd"
            },
            {
              label: "Condiciones",
              data: data.map(p => p.total_condiciones),
              backgroundColor: "#fd7e14"
            },
            {
              label: "Alergias",
              data: data.map(p => p.total_alergias),
              backgroundColor: "#ffc107"
            },
            {
              label: "Citas Total",
              data: data.map(p => p.total_citas),
              backgroundColor: "#198754"
            },
            {
              label: "Citas Cumplidas",
              data: data.map(p => p.citas_cumplidas || 0),
              backgroundColor: "#20c997"
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Comparación entre Pacientes" }
          }
        }
      });

    } catch (err) {
      console.error("Error al comparar:", err);
      alert("Error al comparar pacientes.");
    }
  });

  // ---- Limpiar comparación ----
  limpiarCompBtn.addEventListener("click", () => {
    // Ocultar resultados
    comparacionDiv.classList.add("d-none");
    // Limpiar tabla
    const tbody = document.querySelector("#tablaComparacion tbody");
    if (tbody) tbody.innerHTML = "";
    // Destruir gráfico
    if (chartComparacion) { chartComparacion.destroy(); chartComparacion = null; }
    // Deseleccionar opciones
    Array.from(compararSelect.options).forEach(o => o.selected = false);
  });

  // ---- Inicialización: cargar pacientes al abrir sección ----
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.section === "estadisticas") {
        cargarPacientes();
      }
    });
  });

  // También cargar al inicio por si ya está visible
  cargarPacientes();
})();