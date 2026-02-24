// ===============================
// NAVEGACIÓN ENTRE SECCIONES
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const navBtns = document.querySelectorAll(".nav-btn[data-section]");
  const sections = document.querySelectorAll(".section");

  /* Submenú Estadísticas */
  const btnEstadisticas = document.getElementById("btnEstadisticas");
  const submenuEst = document.getElementById("submenuEstadisticas");
  const estSubSections = ["est-individual", "est-comparar", "est-reporte"];

  function hideAllSections() {
    sections.forEach(s => s.classList.add("d-none"));
    navBtns.forEach(b => b.classList.remove("active"));
  }

  // Mostrar panel por defecto medicamentos
  hideAllSections();
  const medicamentos = document.getElementById("medicamentos");
  if (medicamentos) {
    medicamentos.classList.remove("d-none");
    document.querySelector('.nav-btn[data-section="medicamentos"]')?.classList.add("active");
  }

  /* Click en botones normales (no parent) */
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (!sectionId) return;
      hideAllSections();

      /* Si es sub-item de Estadísticas, resaltar padre */
      if (estSubSections.includes(sectionId)) {
        btnEstadisticas?.classList.add("open");
        submenuEst?.classList.add("show");
      } else {
        /* Colapsar submenú al navegar a otra sección */
        btnEstadisticas?.classList.remove("open");
        submenuEst?.classList.remove("show");
      }
      }

      btn.classList.add("active");
      const s = document.getElementById(sectionId);
      if (s) s.classList.remove("d-none");
    });
  });

  /* Toggle submenú al hacer click en "Estadísticas" padre */
  if (btnEstadisticas) {
    btnEstadisticas.addEventListener("click", () => {
      const isOpen = btnEstadisticas.classList.toggle("open");
      submenuEst?.classList.toggle("show", isOpen);
      /* Si se abre y ningún sub-item está activo, mostrar el primero */
      if (isOpen) {
        const anyActive = submenuEst?.querySelector(".nav-btn-sub.active");
        if (!anyActive) {
          const first = submenuEst?.querySelector('.nav-btn-sub[data-section="est-individual"]');
          if (first) first.click();
        }
      }
    });
  }
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
// REGISTRO DE MEDICAMENTOS MEJORADO
// ===============================
(function(){
  const guardarBtn = document.getElementById("guardarBtn");
  const guardarYOtroBtn = document.getElementById("guardarYOtroBtn");
  const tablaMedicamentos = document.querySelector("#tablaMedicamentos tbody");
  const modalMedicamento = document.getElementById("modalMedicamento");
  const modalTitle = document.getElementById("modalTitle");
  
  // Campos del formulario
  const medicamentoId = document.getElementById("medicamentoId");
  const pacienteSelect = document.getElementById("pacienteMedicamento");
  const estadoSelect = document.getElementById("estadoMedicamento");
  const nombreInput = document.getElementById("nombre");
  const dosisInput = document.getElementById("dosis");
  const frecuenciaSelect = document.getElementById("frecuencia");
  const horaInput = document.getElementById("hora");
  const fechaInicioInput = document.getElementById("fechaInicio");
  const fechaFinInput = document.getElementById("fechaFin");
  const notasInput = document.getElementById("notasMedicamento");
  
  // Filtros
  const buscarInput = document.getElementById("buscarMedicamento");
  const filtroPaciente = document.getElementById("filtroPaciente");
  const filtroEstado = document.getElementById("filtroEstado");
  const limpiarFiltrosBtn = document.getElementById("limpiarFiltros");
  
  let medicamentosData = [];
  let pacientesData = [];
  let editingId = null;

  // Cargar pacientes al iniciar
  async function cargarPacientes() {
    try {
      const respuesta = await fetch("http://localhost:3000/usuarios/rol/usuario");
      if (!respuesta.ok) throw new Error("Error al cargar pacientes");
      
      pacientesData = await respuesta.json();
      
      // Llenar select de pacientes en el modal
      if (pacienteSelect) {
        pacienteSelect.innerHTML = '<option value="" selected disabled>Seleccione un paciente</option>';
        pacientesData.forEach(paciente => {
          const option = document.createElement("option");
          option.value = paciente.id;
          option.textContent = `${paciente.nombres} ${paciente.apellidos}`;
          pacienteSelect.appendChild(option);
        });
      }
      
      // Llenar filtro de pacientes
      if (filtroPaciente) {
        filtroPaciente.innerHTML = '<option value="">Todos los pacientes</option>';
        pacientesData.forEach(paciente => {
          const option = document.createElement("option");
          option.value = paciente.id;
          option.textContent = `${paciente.nombres} ${paciente.apellidos}`;
          filtroPaciente.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error al cargar pacientes:", error);
      mostrarToast("Error al cargar lista de pacientes", "error");
    }
  }

  // Calcular próxima toma
  function calcularProximaToma(hora, frecuencia) {
    if (!hora || !frecuencia) return "No calculable";
    
    const now = new Date();
    const [hours, minutes] = hora.split(':').map(Number);
    
    let proxima = new Date(now);
    proxima.setHours(hours, minutes, 0, 0);
    
    // Si la hora ya pasó hoy, calcular siguiente toma
    if (proxima <= now) {
      proxima.setHours(proxima.getHours() + parseInt(frecuencia));
    }
    
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    // Formatear fecha
    if (proxima.toDateString() === hoy.toDateString()) {
      return `Hoy ${proxima.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (proxima.toDateString() === manana.toDateString()) {
      return `Mañana ${proxima.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
      return proxima.toLocaleString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'});
    }
  }

  // Validar formulario
  function validarFormulario() {
    let valido = true;
    
    // Validar paciente
    if (!pacienteSelect.value) {
      pacienteSelect.classList.add("is-invalid");
      valido = false;
    } else {
      pacienteSelect.classList.remove("is-invalid");
    }
    
    // Validar nombre
    if (!nombreInput.value.trim()) {
      nombreInput.classList.add("is-invalid");
      valido = false;
    } else {
      nombreInput.classList.remove("is-invalid");
    }
    
    // Validar dosis
    if (!dosisInput.value.trim()) {
      dosisInput.classList.add("is-invalid");
      valido = false;
    } else {
      dosisInput.classList.remove("is-invalid");
    }
    
    // Validar frecuencia
    if (!frecuenciaSelect.value) {
      frecuenciaSelect.classList.add("is-invalid");
      valido = false;
    } else {
      frecuenciaSelect.classList.remove("is-invalid");
    }
    
    // Validar hora
    if (!horaInput.value) {
      horaInput.classList.add("is-invalid");
      valido = false;
    } else {
      horaInput.classList.remove("is-invalid");
    }
    
    return valido;
  }

  // Limpiar validaciones
  function limpiarValidaciones() {
    [pacienteSelect, nombreInput, dosisInput, frecuenciaSelect, horaInput].forEach(el => {
      if (el) el.classList.remove("is-invalid");
    });
  }

  // Guardar medicamento
  async function guardarMedicamento(crearOtro = false) {
    limpiarValidaciones();
    
    if (!validarFormulario()) {
      mostrarToast("Por favor complete todos los campos obligatorios.", "warning");
      return;
    }

    const datos = {
      nombre: nombreInput.value.trim(),
      dosis: dosisInput.value.trim(),
      frecuencia_horas: parseInt(frecuenciaSelect.value, 10),
      hora: horaInput.value,
      paciente_id: parseInt(pacienteSelect.value, 10),
      estado: estadoSelect.value,
      fecha_inicio: fechaInicioInput.value || null,
      fecha_fin: fechaFinInput.value || null,
      notas: notasInput.value.trim() || null
    };

    try {
      let url = "http://localhost:3000/Registro_medicamentos";
      let method = "POST";
      
      // Si estamos editando, usar PUT
      if (editingId) {
        url = `http://localhost:3000/Registro_medicamentos/${editingId}`;
        method = "PUT";
      }

      const resp = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });

      const resultado = await resp.json();
      
      if (resp.ok) {
        mostrarToast(resultado.mensaje || "Medicamento guardado correctamente.", "success");
        
        if (crearOtro) {
          // Limpiar solo ciertos campos para crear otro
          nombreInput.value = "";
          dosisInput.value = "";
          notasInput.value = "";
          nombreInput.focus();
        } else {
          // Cerrar modal y limpiar todo
          const modal = bootstrap.Modal.getInstance(modalMedicamento);
          if (modal) modal.hide();
          limpiarFormulario();
        }
        
        cargarRegistroMedicamentos();
      } else {
        mostrarToast("Error: " + (resultado.mensaje || "No se pudo guardar"), "error");
      }

    } catch (error) {
      console.error("Error al guardar medicamento:", error);
      mostrarToast("No se pudo conectar con el servidor.", "error");
    }
  }

  // Limpiar formulario
  function limpiarFormulario() {
    editingId = null;
    if (medicamentoId) medicamentoId.value = "";
    if (pacienteSelect) pacienteSelect.value = "";
    if (estadoSelect) estadoSelect.value = "activo";
    if (nombreInput) nombreInput.value = "";
    if (dosisInput) dosisInput.value = "";
    if (frecuenciaSelect) frecuenciaSelect.value = "";
    if (horaInput) horaInput.value = "";
    if (fechaInicioInput) fechaInicioInput.value = "";
    if (fechaFinInput) fechaFinInput.value = "";
    if (notasInput) notasInput.value = "";
    if (modalTitle) modalTitle.textContent = "Registrar Medicamento";
    if (guardarYOtroBtn) guardarYOtroBtn.classList.remove("d-none");
    limpiarValidaciones();
  }

  // Cargar medicamentos
  async function cargarRegistroMedicamentos() {
    try {
      const respuesta = await fetch("http://localhost:3000/Registro_medicamentos");
      if (!respuesta.ok) throw new Error("Error al cargar medicamentos");
      
      medicamentosData = await respuesta.json();
      aplicarFiltros();
    } catch (err) {
      console.error("Error al cargar registro:", err);
      mostrarToast("Error al cargar medicamentos", "error");
    }
  }

  // Aplicar filtros
  function aplicarFiltros() {
    let filtrados = [...medicamentosData];
    
    // Filtro por búsqueda
    const busqueda = buscarInput?.value.toLowerCase().trim();
    if (busqueda) {
      filtrados = filtrados.filter(m => 
        m.nombre.toLowerCase().includes(busqueda) ||
        m.dosis.toLowerCase().includes(busqueda)
      );
    }
    
    // Filtro por paciente
    const pacienteId = filtroPaciente?.value;
    if (pacienteId) {
      filtrados = filtrados.filter(m => m.paciente_id == pacienteId);
    }
    
    // Filtro por estado
    const estado = filtroEstado?.value;
    if (estado) {
      filtrados = filtrados.filter(m => m.estado === estado);
    }
    
    renderMedicamentos(filtrados);
  }

  // Renderizar medicamentos
  function renderMedicamentos(lista) {
    if (!tablaMedicamentos) return;
    tablaMedicamentos.innerHTML = "";
    
    if (lista.length === 0) {
      tablaMedicamentos.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="bi bi-inbox display-4 d-block mb-2"></i>
            No hay medicamentos que coincidan con los filtros.
          </td>
        </tr>
      `;
      return;
    }
    
    lista.forEach((m) => {
      const paciente = pacientesData.find(p => p.id === m.paciente_id);
      const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : "No asignado";
      const proximaToma = calcularProximaToma(m.hora, m.frecuencia_horas);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="badge bg-${m.estado === 'activo' ? 'success' : 'secondary'}">
            ${m.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td><strong>${escapeHtml(m.nombre)}</strong></td>
        <td>${escapeHtml(m.dosis)}</td>
        <td>${escapeHtml(nombrePaciente)}</td>
        <td>Cada ${m.frecuencia_horas}h</td>
        <td>
          <span class="badge bg-info text-dark">
            <i class="bi bi-clock me-1"></i> ${proximaToma}
          </span>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editarMedicamento(${m.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="eliminarMedicamento(${m.id})" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tablaMedicamentos.appendChild(tr);
    });
  }

  // Editar medicamento
  window.editarMedicamento = async function(id) {
    const medicamento = medicamentosData.find(m => m.id === id);
    if (!medicamento) {
      mostrarToast("Medicamento no encontrado", "error");
      return;
    }
    
    editingId = id;
    
    // Llenar formulario
    if (medicamentoId) medicamentoId.value = id;
    if (pacienteSelect) pacienteSelect.value = medicamento.paciente_id;
    if (estadoSelect) estadoSelect.value = medicamento.estado || "activo";
    if (nombreInput) nombreInput.value = medicamento.nombre;
    if (dosisInput) dosisInput.value = medicamento.dosis;
    if (frecuenciaSelect) frecuenciaSelect.value = medicamento.frecuencia_horas;
    if (horaInput) horaInput.value = medicamento.hora;
    if (fechaInicioInput) fechaInicioInput.value = medicamento.fecha_inicio || "";
    if (fechaFinInput) fechaFinInput.value = medicamento.fecha_fin || "";
    if (notasInput) notasInput.value = medicamento.notas || "";
    
    // Cambiar título y ocultar "Guardar y Crear Otro"
    if (modalTitle) modalTitle.textContent = "Editar Medicamento";
    if (guardarYOtroBtn) guardarYOtroBtn.classList.add("d-none");
    
    // Mostrar modal
    const modal = new bootstrap.Modal(modalMedicamento);
    modal.show();
  };

  // Eliminar medicamento
  window.eliminarMedicamento = async function(id) {
    if (!confirm("¿Está seguro de que desea eliminar este medicamento?")) return;
    
    try {
      const resp = await fetch(`http://localhost:3000/Registro_medicamentos/${id}`, {
        method: "DELETE"
      });
      
      const resultado = await resp.json();
      
      if (resp.ok) {
        mostrarToast(resultado.mensaje || "Medicamento eliminado correctamente", "success");
        cargarRegistroMedicamentos();
      } else {
        mostrarToast("Error: " + (resultado.mensaje || "No se pudo eliminar"), "error");
      }
    } catch (error) {
      console.error("Error al eliminar medicamento:", error);
      mostrarToast("Error al conectar con el servidor", "error");
    }
  };

  // Event listeners
  if (guardarBtn) {
    guardarBtn.addEventListener("click", () => guardarMedicamento(false));
  }
  
  if (guardarYOtroBtn) {
    guardarYOtroBtn.addEventListener("click", () => guardarMedicamento(true));
  }

  // Event listeners para filtros
  if (buscarInput) {
    buscarInput.addEventListener("input", aplicarFiltros);
  }
  
  if (filtroPaciente) {
    filtroPaciente.addEventListener("change", aplicarFiltros);
  }
  
  if (filtroEstado) {
    filtroEstado.addEventListener("change", aplicarFiltros);
  }
  
  if (limpiarFiltrosBtn) {
    limpiarFiltrosBtn.addEventListener("click", () => {
      if (buscarInput) buscarInput.value = "";
      if (filtroPaciente) filtroPaciente.value = "";
      if (filtroEstado) filtroEstado.value = "";
      aplicarFiltros();
    });
  }

  // Limpiar formulario al cerrar modal
  if (modalMedicamento) {
    modalMedicamento.addEventListener("hidden.bs.modal", limpiarFormulario);
  }

  // Inicializar
  cargarPacientes();
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
        mostrarToast("Por favor ingrese una cantidad válida mayor a 0.", "warning");
        return;
      }

      let datos;

      if (esModoActualizar) {
        // Modo actualizar stock existente
        const medicamentoId = selectMedicamento.value;
        if (!medicamentoId) {
          mostrarToast("Por favor seleccione un medicamento existente.", "warning");
          return;
        }

        const medicamento = inventarioActual.find(m => m.id == medicamentoId);
        if (!medicamento) {
          mostrarToast("Medicamento no encontrado.", "error");
          return;
        }

        datos = {
          id: medicamentoId,
          cantidad: cantidad,
          actualizar: true
        };
      } else {
        // Modo nuevo medicamento
        const nombre = document.getElementById("nombreInv").value.trim();
        const consumo_por_dosis = parseInt(document.getElementById("consumoInv").value, 10);

        if (!nombre || isNaN(consumo_por_dosis) || consumo_por_dosis < 1) {
          mostrarToast("Por favor complete todos los campos correctamente.", "warning");
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
        mostrarToast(resultado.mensaje || (esModoActualizar ? "Stock actualizado correctamente." : "Medicamento agregado al inventario."), "success");
        await cargarInventario();
        await verificarAlertasStock();
        clearInvForm();

      } catch (error) {
        console.error("Error al guardar en inventario:", error);
        mostrarToast("No se pudo conectar con el servidor.", "error");
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
    const alertas = inventario.filter(item => {
      const cantidad = item.cantidad || 0;
      return cantidad <= 10;
    });

    mostrarAlertasStock(alertas);

    if (alertas.length > 0) {
      mostrarToast(`Hay ${alertas.length} medicamento(s) con stock bajo. Revisa las alertas.`, 'warning');
    }
  } catch (error) {
    console.error('Error al verificar stock:', error);
    mostrarAlertasStock([]);
  }
}

function mostrarAlertasStock(alertas) {
  const container = document.getElementById('alertasStock');
  if (!container) return;

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
      mostrarToast("Completa nombre y fecha de nacimiento.", "warning");
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
        mostrarToast(resultado.mensaje || "Ficha médica guardada correctamente.", "success");
        alergias.length = 0;
      } else {
        mostrarToast("Error: " + (resultado.mensaje || "No se pudo guardar la ficha."), "error");
      }
    } catch (error) {
      console.error("Error al enviar ficha médica:", error);
      mostrarToast("Error de conexión con el servidor.", "error");
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
// MÓDULO DE CITAS MÉDICAS - DESACTIVADO
// ===============================
// NOTA: Este módulo ha sido reemplazado por una implementación mejorada
// en cuidador_backend.html que incluye:
// - Selección de pacientes desde API
// - Campos para doctor, especialidad, ubicación
// - Sistema de estados (programada, completada, cancelada)
// - Filtros avanzados
// - Almacenamiento en localStorage
// 
// El nuevo sistema de Citas Médicas se encuentra en el archivo
// cuidador_backend.html en la sección "Script para Citas Médicas"
/*
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
      verBtn.onclick = () => mostrarToast(`Cita: ${formatearFechaHora(citaDate)} - ${cita.motivo}`, "info");

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
      mostrarToast('Completa fecha, hora y motivo.', "warning");
      return;
    }

    const dt = combinarFechaHora(fecha, hora);
    if (!dt || isNaN(dt.getTime())) {
      mostrarToast('Fecha u hora inválida.', "warning");
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
        mostrarToast(data.mensaje || 'Cita guardada correctamente', "success");
        formCita.reset();
        anticipacionInput.value = '60';
        cargarCitasDesdeServidor();
      } else {
        mostrarToast('Error: ' + data.mensaje, "error");
      }
    } catch (error) {
      console.error('Error al enviar la cita:', error);
      mostrarToast('Error al conectar con el servidor.', "error");
    }
  }

  async function eliminarCita(id) {
    try {
      const res = await fetch(`http://localhost:3000/eliminarCita/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok) {
        mostrarToast(data.mensaje || 'Cita eliminada', "success");
        cargarCitasDesdeServidor();
      } else {
        mostrarToast('Error: ' + data.mensaje, "error");
      }
    } catch (error) {
      console.error('Error al eliminar cita:', error);
      mostrarToast('Error al conectar con el servidor.', "error");
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
        mostrarToast(data.mensaje || 'Todas las citas eliminadas', "success");
        cargarCitasDesdeServidor();
      } else {
        mostrarToast('Error: ' + data.mensaje, "error");
      }
    } catch (error) {
      console.error('Error al eliminar citas:', error);
      mostrarToast('Error al conectar con el servidor.', "error");
    }
  }

  formCita.addEventListener('submit', agregarCitaDesdeFormulario);
  if (limpiarCitaBtn) limpiarCitaBtn.addEventListener('click', () => formCita.reset());
  if (borrarTodasCitasBtn) borrarTodasCitasBtn.addEventListener('click', borrarTodasCitas);
})();
*/


// ===============================
// TOASTS PARA NOTIFICACIONES
// ===============================
function mostrarToast(mensaje, tipo = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    console.error('Contenedor de toasts no encontrado');
    return;
  }

  const toastId = 'toast-' + Date.now();
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-bg-${tipo} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(mensaje)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHTML);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 5000
  });

  toast.show();

  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// ===============================
// GESTIÓN DE USUARIOS
// ===============================
(function(){
  const tablaUsuarios = document.querySelector("#tablaUsuarios tbody");
  const noUsuariosDiv = document.getElementById("noUsuarios");
  const abrirModalUsuarioBtn = document.getElementById("abrirModalUsuario");
  const modalUsuario = document.getElementById("modalUsuario");
  const formUsuario = document.getElementById("formUsuario");
  const guardarUsuarioBtn = document.getElementById("guardarUsuarioBtn");
  
  // Campos del formulario
  const nombresUsuario = document.getElementById("nombresUsuario");
  const apellidosUsuario = document.getElementById("apellidosUsuario");
  const identidadUsuario = document.getElementById("identidadUsuario");
  const telefonoUsuario = document.getElementById("telefonoUsuario");
  const emailUsuario = document.getElementById("emailUsuario");
  const passwordUsuario = document.getElementById("passwordUsuario");
  const rolUsuario = document.getElementById("rolUsuario");
  
  let usuariosData = [];
  let editingUserId = null;

  // Cargar usuarios desde el servidor
  async function cargarUsuarios() {
    try {
      const token = localStorage.getItem('auth_token') || 
                    localStorage.getItem('token') || 
                    localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('auth_token') ||
                    sessionStorage.getItem('token');
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const respuesta = await fetch("http://localhost:3000/usuarios", {
        headers: headers
      });
      
      if (!respuesta.ok) {
        if (respuesta.status === 403) {
          mostrarToast("No tienes permisos para ver usuarios", "error");
          return;
        }
        throw new Error("Error al cargar usuarios");
      }
      
      usuariosData = await respuesta.json();
      renderUsuarios();
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      mostrarToast("Error al cargar usuarios: " + error.message, "error");
    }
  }

  // Renderizar usuarios en la tabla
  function renderUsuarios() {
    if (!tablaUsuarios) return;
    
    tablaUsuarios.innerHTML = "";
    
    if (usuariosData.length === 0) {
      if (noUsuariosDiv) noUsuariosDiv.classList.remove("d-none");
      return;
    }
    
    if (noUsuariosDiv) noUsuariosDiv.classList.add("d-none");
    
    usuariosData.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.nombres)}</td>
        <td>${escapeHtml(u.apellidos)}</td>
        <td>${escapeHtml(u.identidad)}</td>
        <td>${escapeHtml(u.telefono)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge bg-${getRolBadgeColor(u.rol)}">${escapeHtml(u.rol)}</span></td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editarUsuario(${u.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="eliminarUsuario(${u.id})" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tablaUsuarios.appendChild(tr);
    });
  }

  // Obtener color de badge según rol
  function getRolBadgeColor(rol) {
    switch(rol) {
      case 'administrador': return 'danger';
      case 'empleado': return 'warning';
      case 'usuario': return 'info';
      default: return 'secondary';
    }
  }

  // Abrir modal para nuevo usuario
  function abrirModalNuevoUsuario() {
    editingUserId = null;
    formUsuario.reset();
    document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="bi bi-person-plus me-2"></i> Nuevo Usuario';
    guardarUsuarioBtn.textContent = "Guardar Usuario";
    
    // Mostrar requisitos de contraseña
    const passwordRequisitos = document.getElementById("passwordRequisitosUsuario");
    if (passwordRequisitos) passwordRequisitos.style.display = "none";
    
    const modal = new bootstrap.Modal(modalUsuario);
    modal.show();
  }

  // Guardar usuario (crear o actualizar)
  async function guardarUsuario() {
    // Validar campos
    if (!nombresUsuario.value.trim() || !apellidosUsuario.value.trim() || 
        !identidadUsuario.value.trim() || !telefonoUsuario.value.trim() || 
        !emailUsuario.value.trim() || !rolUsuario.value) {
      mostrarToast("Por favor complete todos los campos obligatorios", "warning");
      return;
    }

    // Validar contraseña solo si es nuevo usuario o se proporcionó una
    const password = passwordUsuario.value;
    if (!editingUserId && !password) {
      mostrarToast("La contraseña es obligatoria para nuevos usuarios", "warning");
      return;
    }

    if (password && !passwordUsuarioEsValida()) {
      mostrarToast("La contraseña no cumple con los requisitos mínimos", "warning");
      return;
    }

    const datos = {
      nombres: nombresUsuario.value.trim(),
      apellidos: apellidosUsuario.value.trim(),
      identidad: identidadUsuario.value.trim(),
      telefono: telefonoUsuario.value.trim(),
      email: emailUsuario.value.trim(),
      password: password || undefined,
      rol: rolUsuario.value
    };

    try {
      let url = "http://localhost:3000/registraradm";
      let method = "POST";
      
      if (editingUserId) {
        url = `http://localhost:3000/usuarios/${editingUserId}`;
        method = "PUT";
      }

      const token = localStorage.getItem('auth_token') || 
                    localStorage.getItem('token') || 
                    localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('auth_token') ||
                    sessionStorage.getItem('token');
      
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const resp = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(datos)
      });

      const resultado = await resp.json();
      
      if (resp.ok) {
        mostrarToast(resultado.mensaje || (editingUserId ? "Usuario actualizado correctamente" : "Usuario registrado correctamente"), "success");
        const modal = bootstrap.Modal.getInstance(modalUsuario);
        if (modal) modal.hide();
        await cargarUsuarios();
      } else {
        mostrarToast("Error: " + (resultado.mensaje || resultado.error || "No se pudo guardar"), "error");
      }
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      mostrarToast("Error al conectar con el servidor: " + error.message, "error");
    }
  }

  // Editar usuario
  window.editarUsuario = async function(id) {
    const usuario = usuariosData.find(u => u.id === id);
    if (!usuario) {
      mostrarToast("Usuario no encontrado", "error");
      return;
    }
    
    editingUserId = id;
    
    nombresUsuario.value = usuario.nombres;
    apellidosUsuario.value = usuario.apellidos;
    identidadUsuario.value = usuario.identidad;
    telefonoUsuario.value = usuario.telefono;
    emailUsuario.value = usuario.email;
    rolUsuario.value = usuario.rol;
    passwordUsuario.value = ""; // Dejar vacío para no cambiar
    
    document.querySelector("#modalUsuario .modal-title").innerHTML = '<i class="bi bi-pencil-square me-2"></i> Editar Usuario';
    guardarUsuarioBtn.textContent = "Actualizar Usuario";
    
    // Ocultar requisitos de contraseña al editar
    const passwordRequisitos = document.getElementById("passwordRequisitosUsuario");
    if (passwordRequisitos) passwordRequisitos.style.display = "none";
    
    const modal = new bootstrap.Modal(modalUsuario);
    modal.show();
  };

  // Eliminar usuario
  window.eliminarUsuario = async function(id) {
    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return;
    
    try {
      const token = localStorage.getItem('auth_token') || 
                    localStorage.getItem('token') || 
                    localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('auth_token') ||
                    sessionStorage.getItem('token');
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const resp = await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: "DELETE",
        headers: headers
      });
      
      const resultado = await resp.json();
      
      if (resp.ok) {
        mostrarToast(resultado.mensaje || "Usuario eliminado correctamente", "success");
        await cargarUsuarios();
      } else {
        mostrarToast("Error: " + (resultado.mensaje || "No se pudo eliminar"), "error");
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      mostrarToast("Error al conectar con el servidor: " + error.message, "error");
    }
  };

  // Event listeners
  if (abrirModalUsuarioBtn) {
    abrirModalUsuarioBtn.addEventListener("click", abrirModalNuevoUsuario);
  }
  
  if (guardarUsuarioBtn) {
    guardarUsuarioBtn.addEventListener("click", guardarUsuario);
  }

  // Cargar usuarios cuando se muestre la sección
  const usuariosBtn = document.querySelector('.nav-btn[data-section="usuarios"]');
  if (usuariosBtn) {
    usuariosBtn.addEventListener("click", () => {
      cargarUsuarios();
    });
  }

  // Exponer función de carga global para que pueda ser llamada desde otros scripts
  window.cargarUsuarios = cargarUsuarios;
})();

// ===============================
// UTILIDAD
// ===============================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || "");
  return div.innerHTML;
}
=======

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

      // HU-42: También cargar pacientes en el selector del reporte semanal
      cargarPacientesReporte(pacientes);
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
          maintainAspectRatio: false,
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
          maintainAspectRatio: false,
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
          maintainAspectRatio: false,
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
          maintainAspectRatio: false,
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

  // ===============================
  // HU-42: REPORTE SEMANAL DE CUMPLIMIENTO
  // Funciones: Generar reporte semanal, gráfico de barras diario,
  //   gráfico donut resumen, tabla de desglose, detalle por medicamento,
  //   exportar a PDF
  // ===============================

  const rptPacienteSelect = document.getElementById("rptPacienteSelect");
  const rptSemanaInput = document.getElementById("rptSemanaInput");
  const rptGenerarBtn = document.getElementById("rptGenerarBtn");
  const rptExportarPdfBtn = document.getElementById("rptExportarPdfBtn");
  const rptResultados = document.getElementById("rptResultados");

  let chartReporteSemanal = null;
  let chartReporteDonut = null;
  let datosReporteSemanal = null;

  // Helpers para semana
  function getMondayFromDate(dateStr) {
    // Dado un date string YYYY-MM-DD, retorna el lunes de esa semana
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay() || 7; // domingo = 7
    d.setDate(d.getDate() - day + 1);
    return d;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-HN", { weekday: "short", day: "numeric", month: "short" });
  }

  function getDayName(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-HN", { weekday: "long" });
  }

  // Setear fecha actual por defecto (el lunes de esta semana)
  if (rptSemanaInput) {
    const monday = getMondayFromDate(new Date().toISOString().slice(0, 10));
    rptSemanaInput.value = monday.toISOString().slice(0, 10);
  }

  // Cargar pacientes en el select del reporte
  function cargarPacientesReporte(pacientes) {
    if (!rptPacienteSelect) return;
    rptPacienteSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
    pacientes.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id_paciente;
      opt.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
      rptPacienteSelect.appendChild(opt);
    });
  }

  // Generar reporte
  if (rptGenerarBtn) {
    rptGenerarBtn.addEventListener("click", async () => {
      const idPac = rptPacienteSelect.value;
      const fechaSeleccionada = rptSemanaInput.value;
      if (!idPac || !fechaSeleccionada) {
        alert("Seleccione un paciente y una fecha.");
        return;
      }

      const monday = getMondayFromDate(fechaSeleccionada);
      const fechaInicio = monday.toISOString().slice(0, 10);

      try {
        const resp = await fetch(`${API}/reporte-semanal/${idPac}?fecha_inicio=${fechaInicio}`);
        if (!resp.ok) throw new Error("Error al obtener reporte");
        const data = await resp.json();
        datosReporteSemanal = data;

        rptResultados.classList.remove("d-none");
        rptExportarPdfBtn.disabled = false;

        // Rango de fechas
        document.getElementById("rptRangoFechas").textContent =
          `${formatDate(data.fecha_inicio)} — ${formatDate(data.fecha_fin)}`;

        // Resumen textual
        document.getElementById("rptResumenTexto").innerHTML =
          `${escapeHtml(data.resumen)} <span class="badge-adherencia ${data.nivel_adherencia.toLowerCase()}">${data.nivel_adherencia}</span>`;

        // Tarjetas resumen
        document.getElementById("rptPctSemanal").textContent = data.porcentaje + "%";
        document.getElementById("rptTomados").textContent = data.total_tomados;
        document.getElementById("rptProgramados").textContent = data.total_programados;
        document.getElementById("rptNivel").textContent = data.nivel_adherencia;

        const nivelIcon = document.getElementById("rptNivelIcon");
        const colores = { Excelente: "text-success", Buena: "text-primary", Regular: "text-warning", Baja: "text-danger" };
        nivelIcon.className = `bi bi-trophy fs-2 ${colores[data.nivel_adherencia] || "text-secondary"}`;

        // Color de la tarjeta del porcentaje
        const pctEl = document.getElementById("rptPctSemanal");
        pctEl.className = "mt-2 mb-0";
        if (data.porcentaje >= 90) pctEl.classList.add("text-success");
        else if (data.porcentaje >= 75) pctEl.classList.add("text-primary");
        else if (data.porcentaje >= 50) pctEl.classList.add("text-warning");
        else pctEl.classList.add("text-danger");

        // ---- Gráfico barras diario ----
        if (chartReporteSemanal) chartReporteSemanal.destroy();
        const ctxBar = document.getElementById("chartReporteSemanal").getContext("2d");

        chartReporteSemanal = new Chart(ctxBar, {
          type: "bar",
          data: {
            labels: data.dias.map(d => getDayName(d.fecha)),
            datasets: [
              {
                label: "Programados",
                data: data.dias.map(d => d.programados),
                backgroundColor: "rgba(13, 110, 253, 0.3)",
                borderColor: "#0d6efd",
                borderWidth: 1
              },
              {
                label: "Tomados",
                data: data.dias.map(d => d.tomados),
                backgroundColor: "rgba(25, 135, 84, 0.7)",
                borderColor: "#198754",
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
              legend: { position: "top" },
              title: { display: false }
            }
          }
        });

        // ---- Gráfico donut resumen ----
        if (chartReporteDonut) chartReporteDonut.destroy();
        const ctxDonut = document.getElementById("chartReporteDonut").getContext("2d");
        const noTomados = data.total_programados - data.total_tomados;

        chartReporteDonut = new Chart(ctxDonut, {
          type: "doughnut",
          data: {
            labels: ["Tomados", "No tomados"],
            datasets: [{
              data: [data.total_tomados, noTomados < 0 ? 0 : noTomados],
              backgroundColor: ["#198754", "#dc3545"],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              title: {
                display: true,
                text: `${data.porcentaje}% cumplimiento semanal`
              }
            }
          }
        });

        // ---- Tabla desglose diario ----
        const tbody = document.querySelector("#tablaReporteSemanal tbody");
        tbody.innerHTML = "";
        data.dias.forEach(dia => {
          const tr = document.createElement("tr");
          const pctTxt = dia.porcentaje !== null ? dia.porcentaje + "%" : "Sin datos";
          let badgeClass = "bg-secondary";
          if (dia.porcentaje !== null) {
            if (dia.porcentaje >= 90) badgeClass = "bg-success";
            else if (dia.porcentaje >= 75) badgeClass = "bg-primary";
            else if (dia.porcentaje >= 50) badgeClass = "bg-warning text-dark";
            else badgeClass = "bg-danger";
          }
          tr.innerHTML = `
            <td>${getDayName(dia.fecha)}</td>
            <td>${dia.fecha}</td>
            <td>${dia.programados}</td>
            <td>${dia.tomados}</td>
            <td><span class="badge ${badgeClass}">${pctTxt}</span></td>
          `;
          tbody.appendChild(tr);
        });

        // ---- Detalle por medicamento ----
        const detDiv = document.getElementById("rptDetalleMeds");
        let detHtml = "";
        data.dias.forEach(dia => {
          if (dia.detalle.length === 0) return;
          detHtml += `<div class="dia-grupo">`;
          detHtml += `<h6><strong>${getDayName(dia.fecha)}</strong> (${dia.fecha})</h6>`;
          detHtml += `<ul class="list-unstyled mb-0">`;
          dia.detalle.forEach(med => {
            const icon = med.tomado
              ? '<i class="bi bi-check-circle-fill text-success me-1"></i>'
              : '<i class="bi bi-x-circle-fill text-danger me-1"></i>';
            detHtml += `<li>${icon} ${escapeHtml(med.medicamento)} — ${escapeHtml(med.dosis || "")} (${med.horario || ""})</li>`;
          });
          detHtml += `</ul></div>`;
        });
        detDiv.innerHTML = detHtml || '<p class="text-muted">No hay datos para esta semana.</p>';

      } catch (err) {
        console.error("Error al generar reporte semanal:", err);
        alert("Error al generar el reporte semanal.");
      }
    });
  }

  // ---- HU-42: Exportar PDF del reporte semanal ----
  if (rptExportarPdfBtn) {
    rptExportarPdfBtn.addEventListener("click", () => {
      if (!datosReporteSemanal) return;
      const d = datosReporteSemanal;

      const diasNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

      const ventana = window.open("", "_blank");
      ventana.document.write(`
        <html><head><title>Reporte Semanal - ${escapeHtml(d.paciente.nombre_completo)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; font-size: 20px; }
          h2 { font-size: 16px; margin-top: 18px; color: #555; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
          th { background: #f5f5f5; }
          .resumen { display: flex; gap: 20px; margin: 10px 0; }
          .resumen div { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 6px; flex: 1; }
          .resumen h3 { margin: 0; font-size: 24px; }
          .resumen small { color: #888; }
          .tomado { color: #198754; font-weight: bold; }
          .no-tomado { color: #dc3545; font-weight: bold; }
          .alerta { background: #f8f9fa; border-left: 4px solid #0d6efd; padding: 10px 14px; margin: 12px 0; border-radius: 4px; }
        </style></head><body>
        <h1>Reporte Semanal de Cumplimiento</h1>
        <p><strong>Paciente:</strong> ${escapeHtml(d.paciente.nombre_completo)}</p>
        <p><strong>Semana:</strong> ${d.fecha_inicio} al ${d.fecha_fin}</p>
        <p><strong>Fecha del reporte:</strong> ${new Date().toLocaleDateString("es-HN")}</p>

        <div class="alerta">${escapeHtml(d.resumen)}</div>

        <div class="resumen">
          <div><h3>${d.porcentaje}%</h3><small>Cumplimiento</small></div>
          <div><h3>${d.total_tomados}</h3><small>Tomados</small></div>
          <div><h3>${d.total_programados}</h3><small>Programados</small></div>
          <div><h3>${d.nivel_adherencia}</h3><small>Adherencia</small></div>
        </div>

        <h2>Desglose Diario</h2>
        <table>
          <tr><th>Día</th><th>Fecha</th><th>Programados</th><th>Tomados</th><th>Cumplimiento</th></tr>
          ${d.dias.map(dia => {
            const dayDate = new Date(dia.fecha + "T00:00:00");
            const dayName = diasNombres[dayDate.getDay()];
            const pct = dia.porcentaje !== null ? dia.porcentaje + "%" : "Sin datos";
            return `<tr><td>${dayName}</td><td>${dia.fecha}</td><td>${dia.programados}</td><td>${dia.tomados}</td><td>${pct}</td></tr>`;
          }).join("")}
        </table>

        <h2>Detalle por Medicamento</h2>
        ${d.dias.map(dia => {
          if (dia.detalle.length === 0) return "";
          const dayDate = new Date(dia.fecha + "T00:00:00");
          const dayName = diasNombres[dayDate.getDay()];
          return `
            <h3 style="font-size:14px;margin-top:12px;">${dayName} (${dia.fecha})</h3>
            <table>
              <tr><th>Medicamento</th><th>Dosis</th><th>Horario</th><th>Estado</th></tr>
              ${dia.detalle.map(m => `
                <tr>
                  <td>${escapeHtml(m.medicamento)}</td>
                  <td>${escapeHtml(m.dosis || "-")}</td>
                  <td>${m.horario || "-"}</td>
                  <td class="${m.tomado ? "tomado" : "no-tomado"}">${m.tomado ? "✓ Tomado" : "✗ No tomado"}</td>
                </tr>
              `).join("")}
            </table>`;
        }).join("")}

        <script>window.onload = function(){ window.print(); }<\/script>
        </body></html>
      `);
      ventana.document.close();
    });
  }

  // ---- Inicialización: cargar pacientes al abrir cualquier sub-sección de estadísticas ----
  const navBtnsEst = document.querySelectorAll(".nav-btn[data-section]");
  const estSubs = ["est-individual", "est-comparar", "est-reporte"];
  navBtnsEst.forEach(btn => {
    btn.addEventListener("click", () => {
      if (estSubs.includes(btn.dataset.section)) {
        cargarPacientes();
      }
    });
  });

  // También cargar al inicio por si ya está visible
  cargarPacientes();
})();
