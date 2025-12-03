// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
const API_URL = 'http://localhost:3000';

function getUsuarioId() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  return usuario.id || 1;
}

// ============================================
// SISTEMA DE MODALES Y NOTIFICACIONES
// ============================================

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
`;
document.head.appendChild(styleSheet);

function mostrarNotificacion(mensaje, tipo = 'info') {
  const colores = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const iconos = {
    success: 'check-circle-fill',
    error: 'exclamation-circle-fill',
    info: 'info-circle-fill',
    warning: 'exclamation-triangle-fill'
  };
  
  const notif = document.createElement('div');
  notif.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    background:white;
    color:#333;
    padding:1rem 1.5rem;
    border-radius:0.5rem;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    z-index:10000;
    border-left:4px solid ${colores[tipo]};
    min-width:300px;
    animation:slideIn 0.3s ease-out;
  `;
  notif.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem">
      <i class="bi bi-${iconos[tipo]}" style="color:${colores[tipo]};font-size:1.5rem"></i>
      <span style="flex:1">${mensaje}</span>
    </div>
  `;
  
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function mostrarConfirmacion(titulo, mensaje) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.5);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
      animation:fadeIn 0.2s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="background:white;padding:2rem;border-radius:1rem;max-width:450px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:scaleIn 0.3s ease-out">
        <h5 style="margin:0 0 1rem 0;color:#1e3a8a;font-size:1.25rem">${titulo}</h5>
        <p style="margin:0 0 1.5rem 0;color:#666;line-height:1.5">${mensaje}</p>
        <div style="display:flex;gap:1rem;justify-content:flex-end">
          <button class="btn btn-secondary" id="btnCancelar">Cancelar</button>
          <button class="btn btn-primary" id="btnAceptar">Aceptar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btnAceptar').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
    
    document.getElementById('btnCancelar').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
  });
}

function mostrarPrompt(titulo, mensaje, placeholder = '') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.5);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
      animation:fadeIn 0.2s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="background:white;padding:2rem;border-radius:1rem;max-width:450px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:scaleIn 0.3s ease-out">
        <h5 style="margin:0 0 1rem 0;color:#1e3a8a;font-size:1.25rem">${titulo}</h5>
        <p style="margin:0 0 1rem 0;color:#666">${mensaje}</p>
        <input type="text" class="form-control" id="promptInput" placeholder="${placeholder}" style="margin-bottom:1.5rem">
        <div style="display:flex;gap:1rem;justify-content:flex-end">
          <button class="btn btn-secondary" id="btnCancelarPrompt">Cancelar</button>
          <button class="btn btn-primary" id="btnAceptarPrompt">Aceptar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = document.getElementById('promptInput');
    input.focus();
    
    document.getElementById('btnAceptarPrompt').addEventListener('click', () => {
      const valor = input.value.trim();
      modal.remove();
      resolve(valor || null);
    });
    
    document.getElementById('btnCancelarPrompt').addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const valor = input.value.trim();
        modal.remove();
        resolve(valor || null);
      }
    });
  });
}

function mostrarAlerta(titulo, mensaje) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.5);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
      animation:fadeIn 0.2s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="background:white;padding:2rem;border-radius:1rem;max-width:400px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:scaleIn 0.3s ease-out">
        <h5 style="margin:0 0 1rem 0;color:#1e3a8a;font-size:1.25rem">${titulo}</h5>
        <p style="margin:0 0 1.5rem 0;color:#666;line-height:1.5">${mensaje}</p>
        <div style="display:flex;justify-content:flex-end">
          <button class="btn btn-primary" id="btnEntendido">Entendido</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btnEntendido').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(true);
      }
    });
  });
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
  const inicio = document.getElementById("inicio");
  if (inicio) {
    inicio.classList.remove("d-none");
    navBtns[0]?.classList.add("active");
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (!sectionId) return;
      hideAllSections();
      btn.classList.add("active");
      const s = document.getElementById(sectionId);
      if (s) {
        s.classList.remove("d-none");
        if (sectionId === 'recetas') {
          cargarRecetas();
          setTimeout(() => cargarHistorialMedicacion(), 300);
        }
        if (sectionId === 'agenda') cargarCitas();
        if (sectionId === 'recompensas') cargarRecompensas();
        if (sectionId === 'emergencia') {
          cargarContactosEmergencia();
          setTimeout(() => cargarHistorialEmergencias(), 300);
        }
        if (sectionId === 'inicio') {
          cargarEstadisticasInicio();
        }
      }
    });
  });

  cargarEstadisticasInicio();
  iniciarVerificacionCitas();
  limpiarNotificacionesAntiguas();
});

// ===============================
// CERRAR SESIÓN
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", async () => {
      const confirmado = await mostrarConfirmacion(
        'Cerrar Sesion',
        'Estas a punto de cerrar tu sesion. Deberas iniciar sesion nuevamente para acceder.'
      );
      
      if (confirmado) {
        localStorage.removeItem('usuario');
        mostrarNotificacion('Sesion cerrada exitosamente', 'success');
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      }
    });
  }
});

// ===============================
// ESTADÍSTICAS DEL INICIO
// ===============================
async function cargarEstadisticasInicio() {
  const idUsuario = getUsuarioId();
  
  try {
    const recetasRes = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await recetasRes.json();
    const statRecetas = document.getElementById('stat-recetas');
    if (statRecetas) statRecetas.textContent = recetas.length;

    const citasRes = await fetch(`${API_URL}/citas/${idUsuario}`);
    const citas = await citasRes.json();
    const citasProximas = citas.filter(c => new Date(c.fecha_hora) > new Date());
    const statCitas = document.getElementById('stat-citas');
    if (statCitas) statCitas.textContent = citasProximas.length;

    const recompensasRes = await fetch(`${API_URL}/recompensas/${idUsuario}`);
    const recompensas = await recompensasRes.json();
    const statPuntos = document.getElementById('stat-puntos');
    const statCumplimiento = document.getElementById('stat-cumplimiento');
    if (statPuntos) statPuntos.textContent = recompensas.puntos_totales || 0;
    if (statCumplimiento) statCumplimiento.textContent = (recompensas.porcentaje_cumplimiento || 0) + '%';

    await cargarMedicamentosHoy();
    await cargarTomasRegistradasHoy();
    await cargarProximaCita();
    await cargarUltimoLogro();
    
  } catch (error) {
    console.error('Error al cargar estadisticas:', error);
  }
}

// ===============================
// CARGAR MEDICAMENTOS DE HOY
// ===============================
async function cargarMedicamentosHoy() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar medicamentos');
    }
    
    const recetas = await response.json();
    
    const listaMedicamentos = document.getElementById('listaMedicamentosHoy');
    if (!listaMedicamentos) return;
    
    listaMedicamentos.innerHTML = '';
    
    if (recetas.length === 0) {
      listaMedicamentos.innerHTML = `
        <div class="list-group-item text-center text-muted">
          No tienes medicamentos registrados
        </div>
      `;
      return;
    }
    
    recetas.forEach((receta) => {
      const div = document.createElement('div');
      div.className = 'list-group-item';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="bi bi-capsule text-primary me-2"></i>
            <strong>${receta.nombre_medicamento}</strong>
            <br>
            <small class="text-muted">Dosis: ${receta.dosis} - ${receta.frecuencia}</small>
          </div>
          <button class="btn btn-sm btn-success" onclick="confirmarTomaMedicamento(${receta.id}, '${receta.nombre_medicamento}')">
            <i class="bi bi-check-circle"></i> Ya tome
          </button>
        </div>
      `;
      listaMedicamentos.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar medicamentos:', error);
    const listaMedicamentos = document.getElementById('listaMedicamentosHoy');
    if (listaMedicamentos) {
      listaMedicamentos.innerHTML = `
        <div class="list-group-item text-center text-danger">
          Error al cargar medicamentos
        </div>
      `;
    }
  }
}

// ===============================
// CARGAR TOMAS REGISTRADAS HOY
// ===============================
async function cargarTomasRegistradasHoy() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/tomasHoy/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar tomas');
    }
    
    const tomas = await response.json();
    
    const listaTomas = document.getElementById('listaTomasHoy');
    if (!listaTomas) return;
    
    listaTomas.innerHTML = '';
    
    if (tomas.length === 0) {
      listaTomas.innerHTML = `
        <div class="list-group-item text-center text-muted">
          Aun no has registrado ninguna toma hoy
        </div>
      `;
      return;
    }
    
    tomas.forEach(toma => {
      const div = document.createElement('div');
      div.className = 'list-group-item';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="bi bi-check-circle-fill text-success me-2"></i>
            <strong>${toma.nombre_medicamento}</strong>
          </div>
          <span class="badge bg-success">${toma.hora_toma}</span>
        </div>
      `;
      listaTomas.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar tomas:', error);
  }
}

// ===============================
// CARGAR PRÓXIMA CITA
// ===============================
async function cargarProximaCita() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/citas/${idUsuario}`);
    const citas = await response.json();
    
    const citasProximas = citas.filter(c => new Date(c.fecha_hora) > new Date())
                               .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    
    const proximaCitaDiv = document.getElementById('proximaCita');
    if (!proximaCitaDiv) return;
    
    if (citasProximas.length === 0) {
      proximaCitaDiv.innerHTML = '<p class="text-muted">Sin citas proximas</p>';
      return;
    }
    
    const proxima = citasProximas[0];
    const fecha = new Date(proxima.fecha_hora);
    
    proximaCitaDiv.innerHTML = `
      <i class="bi bi-calendar-event text-primary" style="font-size: 2rem;"></i>
      <p class="mt-2 mb-1"><strong>${proxima.motivo}</strong></p>
      <small class="text-muted">${fecha.toLocaleDateString()}</small><br>
      <small class="text-muted">${fecha.toLocaleTimeString()}</small>
    `;
  } catch (error) {
    console.error('Error al cargar proxima cita:', error);
  }
}

// ===============================
// CARGAR ÚLTIMO LOGRO
// ===============================
async function cargarUltimoLogro() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/logros/${idUsuario}`);
    const logros = await response.json();
    
    const logroDiv = document.getElementById('logroReciente');
    if (!logroDiv) return;
    
    if (logros.length === 0) {
      logroDiv.innerHTML = `
        <i class="bi bi-trophy-fill text-warning" style="font-size: 3rem;"></i>
        <p class="mt-2 mb-0"><strong>Sigue asi</strong></p>
        <small class="text-muted">Completa tus medicamentos</small>
      `;
      return;
    }
    
    const ultimo = logros[0];
    
    logroDiv.innerHTML = `
      <i class="bi bi-trophy-fill text-warning" style="font-size: 3rem;"></i>
      <p class="mt-2 mb-0"><strong>${ultimo.tipo_logro}</strong></p>
      <small class="text-muted">${ultimo.descripcion}</small><br>
      <span class="badge bg-warning text-dark mt-2">+${ultimo.puntos_ganados} puntos</span>
    `;
  } catch (error) {
    console.error('Error al cargar logro:', error);
  }
}

function irASeccionEmergencia() {
  const emergenciaBtn = document.querySelector('.nav-btn[data-section="emergencia"]');
  if (emergenciaBtn) {
    emergenciaBtn.click();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnEmergenciaInicio = document.querySelector('.card.bg-danger .btn-light');
  
  if (btnEmergenciaInicio) {
    btnEmergenciaInicio.addEventListener("click", () => {
      irASeccionEmergencia();
    });
  }
});
// ============================================
// CONTINUACIÓN - PARTE 2 DE 2
// ============================================

// ===============================
// CONFIRMAR TOMA DE MEDICAMENTO
// ===============================
async function confirmarTomaMedicamento(id_receta, nombre_medicamento) {
  const confirmado = await mostrarConfirmacion(
    'Confirmar toma de medicamento',
    'Confirmas que tomaste ' + nombre_medicamento + '?'
  );
  
  if (!confirmado) return;
  
  const idUsuario = getUsuarioId();
  const horaActual = new Date().toTimeString().slice(0, 8);
  const fechaActual = new Date().toISOString().slice(0, 10);
  
  try {
    const response = await fetch(`${API_URL}/registrarTomaMedicamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: idUsuario,
        id_receta: id_receta,
        nombre_medicamento: nombre_medicamento,
        hora_toma: horaActual,
        fecha_toma: fechaActual
      })
    });
    
    if (!response.ok) {
      throw new Error('Error en la respuesta del servidor');
    }
    
    const data = await response.json();
    
    mostrarNotificacion('Medicamento registrado. Ganaste ' + data.puntos_ganados + ' puntos', 'success');
    
    await cargarEstadisticasInicio();
    await cargarRecompensas();
    
  } catch (error) {
    console.error('Error completo:', error);
    mostrarNotificacion('Error al registrar la toma del medicamento', 'error');
  }
}

// ===============================
// SECCIÓN: RECETAS MÉDICAS
// ===============================
async function cargarRecetas() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar recetas');
    }
    
    const recetas = await response.json();
    
    const tbody = document.querySelector('#recetas table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (recetas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay recetas registradas</td></tr>';
      return;
    }
    
    recetas.forEach(receta => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(receta.fecha_subida).toLocaleDateString()}</td>
        <td><strong>${receta.nombre_medicamento}</strong></td>
        <td>${receta.dosis}</td>
        <td>${receta.frecuencia}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="confirmarTomaMedicamento(${receta.id}, '${receta.nombre_medicamento}')">
            <i class="bi bi-check-circle"></i> Ya tome
          </button>
          <button class="btn btn-sm btn-info me-1" onclick="verReceta(${receta.id})">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="eliminarReceta(${receta.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar recetas:', error);
    mostrarNotificacion('Error al cargar recetas', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnCargarReceta = document.querySelector('#recetas .btn-primary');
  if (btnCargarReceta) {
    btnCargarReceta.addEventListener('click', () => {
      mostrarModalReceta();
    });
  }
});

function mostrarModalReceta() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn 0.2s ease-out';
  
  modal.innerHTML = `
    <div style="background:white;padding:2rem;border-radius:1rem;max-width:500px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:scaleIn 0.3s ease-out">
      <h5 style="margin-bottom:1.5rem;color:#1e3a8a">Nueva Receta Medica</h5>
      
      <div style="margin-bottom:1rem">
        <label style="display:block;margin-bottom:0.5rem;font-weight:500">Medicamento:</label>
        <input type="text" id="modalNombre" class="form-control" placeholder="Nombre del medicamento">
      </div>
      
      <div style="margin-bottom:1rem">
        <label style="display:block;margin-bottom:0.5rem;font-weight:500">Dosis:</label>
        <input type="text" id="modalDosis" class="form-control" placeholder="Ej: 400mg">
      </div>
      
      <div style="margin-bottom:1.5rem">
        <label style="display:block;margin-bottom:0.5rem;font-weight:500">Frecuencia:</label>
        <input type="text" id="modalFrecuencia" class="form-control" placeholder="Ej: cada 8 horas">
      </div>
      
      <div style="display:flex;gap:1rem;justify-content:flex-end">
        <button class="btn btn-secondary" id="btnCancelarReceta">Cancelar</button>
        <button class="btn btn-primary" id="btnGuardarReceta">Guardar Receta</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('modalNombre').focus();
  
  document.getElementById('btnCancelarReceta').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.getElementById('btnGuardarReceta').addEventListener('click', async () => {
    const nombre = document.getElementById('modalNombre').value.trim();
    const dosis = document.getElementById('modalDosis').value.trim();
    const frecuencia = document.getElementById('modalFrecuencia').value.trim();
    
    if (!nombre || !dosis || !frecuencia) {
      await mostrarAlerta('Campos incompletos', 'Todos los campos son obligatorios');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/recetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: getUsuarioId(),
          nombre_medicamento: nombre,
          dosis: dosis,
          frecuencia: frecuencia
        })
      });
      
      const data = await response.json();
      mostrarNotificacion(data.mensaje, 'success');
      modal.remove();
      cargarRecetas();
      cargarHistorialMedicacion();
      
      await registrarMedicamento(nombre, dosis, frecuencia);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al guardar la receta', 'error');
    }
  });
}

async function registrarMedicamento(nombre, dosis, frecuencia) {
  try {
    await fetch(`${API_URL}/Registro_medicamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre,
        dosis: dosis,
        frecuencia_horas: frecuencia,
        hora: new Date().toTimeString().split(' ')[0]
      })
    });
  } catch (error) {
    console.error('Error al registrar medicamento:', error);
  }
}

async function eliminarReceta(id) {
  const confirmado = await mostrarConfirmacion(
    'Eliminar Receta',
    'Estas seguro de que deseas eliminar esta receta? Esta accion no se puede deshacer.'
  );
  
  if (!confirmado) return;
  
  try {
    const response = await fetch(`${API_URL}/recetas/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    mostrarNotificacion(data.mensaje, 'success');
    cargarRecetas();
    cargarHistorialMedicacion();
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al eliminar', 'error');
  }
}

function verReceta(id) {
  mostrarAlerta('Informacion', 'Funcionalidad de ver receta - ID: ' + id);
}

async function cargarHistorialMedicacion() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await response.json();
    
    const historialContainer = document.getElementById('historialMedicacion');
    if (!historialContainer) return;
    
    historialContainer.innerHTML = '';
    
    if (recetas.length === 0) {
      historialContainer.innerHTML = '<p class="text-muted">No hay historial de medicacion</p>';
      return;
    }
    
    const porMes = {};
    recetas.forEach(r => {
      const fecha = new Date(r.fecha_subida);
      const mesAnio = `${fecha.toLocaleString('es', {month: 'long'})} ${fecha.getFullYear()}`;
      if (!porMes[mesAnio]) porMes[mesAnio] = [];
      porMes[mesAnio].push(r);
    });
    
    Object.keys(porMes).forEach(mes => {
      const seccion = document.createElement('div');
      seccion.className = 'mb-4';
      seccion.innerHTML = `
        <h6 class="text-primary mb-3"><i class="bi bi-calendar3"></i> ${mes}</h6>
        <div class="list-group">
          ${porMes[mes].map(r => `
            <div class="list-group-item">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="mb-1">${r.nombre_medicamento}</h6>
                  <p class="mb-1"><strong>Dosis:</strong> ${r.dosis}</p>
                  <p class="mb-1"><strong>Frecuencia:</strong> ${r.frecuencia}</p>
                  <small class="text-muted">Fecha: ${new Date(r.fecha_subida).toLocaleDateString()}</small>
                </div>
                <span class="badge bg-success">Activo</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      historialContainer.appendChild(seccion);
    });
    
  } catch (error) {
    console.error('Error al cargar historial:', error);
  }
}

async function exportarHistorialPDF() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await response.json();
    
    let contenido = 'HISTORIAL DE MEDICACION\n\n';
    recetas.forEach(r => {
      contenido += `${new Date(r.fecha_subida).toLocaleDateString()}\n`;
      contenido += `Medicamento: ${r.nombre_medicamento}\n`;
      contenido += `Dosis: ${r.dosis}\n`;
      contenido += `Frecuencia: ${r.frecuencia}\n\n`;
    });
    
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial_medicacion.txt';
    a.click();
    
    mostrarNotificacion('Historial exportado', 'success');
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al exportar', 'error');
  }
}

// ===============================
// SECCIÓN: AGENDA MÉDICA
// ===============================
async function cargarCitas() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/citas/${idUsuario}`);
    const citas = await response.json();
    
    const listGroup = document.querySelector('#agenda .list-group');
    if (!listGroup) return;
    
    listGroup.innerHTML = '';
    
    const citasProximas = citas.filter(c => new Date(c.fecha_hora) > new Date());
    
    if (citasProximas.length === 0) {
      listGroup.innerHTML = '<div class="list-group-item">No hay citas proximas</div>';
      return;
    }
    
    citasProximas.forEach(cita => {
      const fecha = new Date(cita.fecha_hora);
      const div = document.createElement('div');
      div.className = 'list-group-item';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${cita.motivo}</h6>
            <small class="text-muted"><i class="bi bi-calendar3"></i> ${fecha.toLocaleDateString()} - ${fecha.toLocaleTimeString()}</small>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarCita(${cita.id_cita})">
            <i class="bi bi-x-circle"></i> Cancelar
          </button>
        </div>
      `;
      listGroup.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar citas:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fecha = citaForm.querySelector('input[type="date"]').value;
      const hora = citaForm.querySelector('input[type="time"]').value;
      const motivo = citaForm.querySelector('input[placeholder*="Consulta"]').value.trim();
      
      if (!fecha || !hora || !motivo) {
        await mostrarAlerta('Campos incompletos', 'Por favor completa todos los campos');
        return;
      }
      
      const fechaHora = `${fecha} ${hora}:00`;
      
      try {
        const response = await fetch(`${API_URL}/guardarCita`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_paciente: getUsuarioId(),
            fecha_hora: fechaHora,
            motivo: motivo,
            anticipacion_min: 30
          })
        });
        
        const data = await response.json();
        mostrarNotificacion(data.mensaje, 'success');
        citaForm.reset();
        cargarCitas();
        cargarEstadisticasInicio();
      } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al guardar la cita', 'error');
      }
    });
  }
});

async function eliminarCita(id) {
  const confirmado = await mostrarConfirmacion(
    'Cancelar Cita',
    'Estas seguro de que deseas cancelar esta cita medica?'
  );
  
  if (!confirmado) return;
  
  try {
    const response = await fetch(`${API_URL}/eliminarCita/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    mostrarNotificacion(data.mensaje, 'success');
    cargarCitas();
    cargarEstadisticasInicio();
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al cancelar', 'error');
  }
}

// ===============================
// CONTINÚA EN SIGUIENTE MENSAJE...
// ===============================
// ============================================
// CONTINUACIÓN FINAL - PARTE 3 DE 3
// ============================================

// ===============================
// SECCIÓN: RECOMPENSAS
// ===============================
async function cargarRecompensas() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recompensas/${idUsuario}`);
    const recompensas = await response.json();
    
    document.querySelector('#recompensas .bg-light:nth-child(1) h3').textContent = recompensas.puntos_totales || 0;
    document.querySelector('#recompensas .bg-light:nth-child(2) h3').textContent = recompensas.medallas || 0;
    document.querySelector('#recompensas .bg-light:nth-child(3) h3').textContent = `${recompensas.porcentaje_cumplimiento || 0}%`;
    
    const progreso = ((recompensas.puntos_totales || 0) % 500) / 500 * 100;
    document.querySelector('#recompensas .progress-bar').style.width = `${progreso}%`;
    document.querySelector('#recompensas .progress-bar').textContent = `${Math.round(progreso)}%`;
    
    const logrosRes = await fetch(`${API_URL}/logros/${idUsuario}`);
    const logros = await logrosRes.json();
    
    const logrosUl = document.querySelector('#recompensas .list-group');
    if (logrosUl) {
      logrosUl.innerHTML = '';
      logros.slice(0, 3).forEach(logro => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
          <i class="bi bi-check-circle-fill text-success"></i> ${logro.descripcion} - <strong>+${logro.puntos_ganados} puntos</strong>
          <small class="text-muted d-block">${new Date(logro.fecha_obtenido).toLocaleDateString()}</small>
        `;
        logrosUl.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error al cargar recompensas:', error);
  }
}

// ===============================
// SECCIÓN: EMERGENCIA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const emergenciaBtn = document.getElementById("emergenciaBtn");
  if (emergenciaBtn) {
    emergenciaBtn.addEventListener("click", async () => {
      const confirmado = await mostrarConfirmacion(
        'Activar Emergencia',
        'Estas a punto de activar el protocolo de emergencia. Se notificara a tus contactos de emergencia y se compartira tu ubicacion.'
      );
      
      if (confirmado) {
        emergenciaBtn.disabled = true;
        emergenciaBtn.innerHTML = '<div class="sos-icon"><i class="bi bi-hourglass-split"></i></div><div class="sos-text">ACTIVANDO</div>';
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            try {
              const response = await fetch(`${API_URL}/activarEmergencia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id_usuario: getUsuarioId(),
                  tipo_activacion: 'boton',
                  ubicacion_lat: lat,
                  ubicacion_lng: lng
                })
              });
              
              const data = await response.json();
              mostrarNotificacion('Emergencia activada. Contactos notificados.', 'error');
              cargarHistorialEmergencias();
              
            } catch (error) {
              console.error('Error:', error);
              mostrarNotificacion('Error al activar emergencia', 'error');
            } finally {
              setTimeout(() => {
                emergenciaBtn.disabled = false;
                emergenciaBtn.innerHTML = '<div class="sos-icon"><i class="bi bi-telephone-fill"></i></div><div class="sos-text">SOS</div><div class="sos-subtext">EMERGENCIA</div>';
              }, 3000);
            }
          }, async () => {
            try {
              await fetch(`${API_URL}/activarEmergencia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id_usuario: getUsuarioId(),
                  tipo_activacion: 'boton'
                })
              });
              
              mostrarNotificacion('Emergencia activada', 'error');
              cargarHistorialEmergencias();
            } catch (error) {
              console.error('Error:', error);
              mostrarNotificacion('Error al activar emergencia', 'error');
            } finally {
              setTimeout(() => {
                emergenciaBtn.disabled = false;
                emergenciaBtn.innerHTML = '<div class="sos-icon"><i class="bi bi-telephone-fill"></i></div><div class="sos-text">SOS</div><div class="sos-subtext">EMERGENCIA</div>';
              }, 3000);
            }
          });
        }
      }
    });
  }
});

async function cargarContactosEmergencia() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/contactosEmergencia/${idUsuario}`);
    const contactos = await response.json();
    
    const listGroup = document.querySelector('#emergencia .card:nth-child(2) .list-group');
    if (!listGroup) return;
    
    listGroup.innerHTML = '';
    
    if (contactos.length === 0) {
      listGroup.innerHTML = '<div class="list-group-item">No hay contactos registrados</div>';
      return;
    }
    
    contactos.forEach(contacto => {
      const div = document.createElement('div');
      div.className = 'list-group-item';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">${contacto.nombre_contacto} ${contacto.relacion ? `(${contacto.relacion})` : ''}</h6>
            <small class="text-muted"><i class="bi bi-telephone"></i> ${contacto.telefono}</small>
          </div>
          <button class="btn btn-sm btn-success" onclick="window.location.href='tel:${contacto.telefono}'">
            <i class="bi bi-telephone-fill"></i> Llamar
          </button>
        </div>
      `;
      listGroup.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar contactos:', error);
  }
}

async function cargarHistorialEmergencias() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/historialEmergencias/${idUsuario}`);
    const emergencias = await response.json();
    
    const historialContainer = document.getElementById('historialEmergencias');
    if (!historialContainer) return;
    
    historialContainer.innerHTML = '';
    
    if (emergencias.length === 0) {
      historialContainer.innerHTML = '<p class="text-muted">No hay historial de emergencias</p>';
      return;
    }
    
    emergencias.slice(0, 5).forEach(e => {
      const div = document.createElement('div');
      div.className = 'list-group-item';
      
      const estadoColor = e.estado === 'activa' ? 'danger' : e.estado === 'cancelada' ? 'warning' : 'success';
      
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">Emergencia por ${e.tipo_activacion}</h6>
            <small class="text-muted">${new Date(e.fecha_hora).toLocaleString()}</small>
            ${e.ubicacion_lat ? `<br><small class="text-muted"><i class="bi bi-geo-alt"></i> Ubicacion compartida</small>` : ''}
            ${e.notas ? `<br><small class="text-muted">Motivo: ${e.notas}</small>` : ''}
          </div>
          <div>
            <span class="badge bg-${estadoColor}">${e.estado}</span>
            ${e.estado === 'activa' ? `<button class="btn btn-sm btn-warning ms-2" onclick="cancelarEmergencia(${e.id})"><i class="bi bi-x-circle"></i> Cancelar</button>` : ''}
          </div>
        </div>
      `;
      historialContainer.appendChild(div);
    });
  } catch (error) {
    console.error('Error al cargar historial de emergencias:', error);
  }
}

async function cancelarEmergencia(id) {
  const motivo = await mostrarPrompt(
    'Cancelar Emergencia',
    'Motivo de la cancelacion (opcional):',
    'Escribe el motivo...'
  );
  
  if (motivo === null) return;
  
  try {
    const response = await fetch(`${API_URL}/cancelarEmergencia/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        estado: 'cancelada',
        notas: motivo || 'Cancelada por el paciente'
      })
    });
    
    const data = await response.json();
    mostrarNotificacion(data.mensaje, 'success');
    cargarHistorialEmergencias();
  } catch (error) {
    console.error('Error:', error);
    mostrarNotificacion('Error al cancelar emergencia', 'error');
  }
}

// ===============================
// RECONOCIMIENTO DE VOZ
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const activarVozBtn = document.getElementById("activarVozBtn");
  const vozStatus = document.getElementById("vozStatus");
  
  if (!activarVozBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    vozStatus.innerHTML = '<div class="alert alert-warning mt-3"><i class="bi bi-exclamation-triangle"></i> Tu navegador no soporta reconocimiento de voz.</div>';
    activarVozBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;

  let escuchando = false;

  activarVozBtn.addEventListener("click", () => {
    if (!escuchando) {
      recognition.start();
      escuchando = true;
      activarVozBtn.innerHTML = '<i class="bi bi-mic-fill"></i> Escuchando...';
      activarVozBtn.classList.remove("btn-outline-primary");
      activarVozBtn.classList.add("btn-danger");
      vozStatus.innerHTML = '<div class="alert alert-info mt-3"><i class="bi bi-mic-fill"></i> <strong>Escuchando...</strong> Di "emergencia", "SOS", "ayuda" o "auxilio"</div>';
    } else {
      recognition.stop();
      escuchando = false;
      activarVozBtn.innerHTML = '<i class="bi bi-mic"></i> Activar Reconocimiento de Voz';
      activarVozBtn.classList.remove("btn-danger");
      activarVozBtn.classList.add("btn-outline-primary");
      vozStatus.innerHTML = '';
    }
  });

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    vozStatus.innerHTML = `<div class="alert alert-secondary mt-3">Escuche: <strong>"${transcript}"</strong></div>`;
    
    if (transcript.includes("emergencia") || 
        transcript.includes("sos") || 
        transcript.includes("ayuda") || 
        transcript.includes("auxilio")) {
      
      vozStatus.innerHTML = '<div class="alert alert-danger mt-3"><strong>EMERGENCIA DETECTADA POR VOZ</strong></div>';
      
      setTimeout(async () => {
        const confirmado = await mostrarConfirmacion(
          'Emergencia Detectada',
          'Se detecto una palabra de emergencia por voz. Deseas activar el protocolo de emergencia?'
        );
        
        if (confirmado) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              try {
                await fetch(`${API_URL}/activarEmergencia`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id_usuario: getUsuarioId(),
                    tipo_activacion: 'voz',
                    ubicacion_lat: position.coords.latitude,
                    ubicacion_lng: position.coords.longitude
                  })
                });
                
                mostrarNotificacion('Emergencia activada por voz', 'error');
                cargarHistorialEmergencias();
              } catch (error) {
                console.error('Error:', error);
              }
            });
          }
        }
      }, 500);
    }
    
    escuchando = false;
    activarVozBtn.innerHTML = '<i class="bi bi-mic"></i> Activar Reconocimiento de Voz';
    activarVozBtn.classList.remove("btn-danger");
    activarVozBtn.classList.add("btn-outline-primary");
  };

  recognition.onerror = (event) => {
    let errorMsg = "Error desconocido";
    switch(event.error) {
      case 'no-speech': errorMsg = "No se detecto voz"; break;
      case 'audio-capture': errorMsg = "No se pudo acceder al microfono"; break;
      case 'not-allowed': errorMsg = "Permiso de microfono denegado"; break;
      default: errorMsg = `Error: ${event.error}`;
    }
    
    vozStatus.innerHTML = `<div class="alert alert-danger mt-3"><i class="bi bi-x-circle"></i> ${errorMsg}</div>`;
    escuchando = false;
    activarVozBtn.innerHTML = '<i class="bi bi-mic"></i> Activar Reconocimiento de Voz';
    activarVozBtn.classList.remove("btn-danger");
    activarVozBtn.classList.add("btn-outline-primary");
  };

  recognition.onend = () => {
    if (escuchando) {
      escuchando = false;
      activarVozBtn.innerHTML = '<i class="bi bi-mic"></i> Activar Reconocimiento de Voz';
      activarVozBtn.classList.remove("btn-danger");
      activarVozBtn.classList.add("btn-outline-primary");
    }
  };
});

// ============================================
// SISTEMA DE NOTIFICACIONES DE CITAS
// ============================================

let intervaloCitas = null;

function iniciarVerificacionCitas() {
  if (intervaloCitas) {
    clearInterval(intervaloCitas);
  }
  
  intervaloCitas = setInterval(() => {
    verificarCitasProximas();
  }, 30000);
  
  verificarCitasProximas();
}

async function verificarCitasProximas() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/citas/${idUsuario}`);
    const citas = await response.json();
    
    const ahora = new Date();
    
    citas.forEach(cita => {
      const fechaCita = new Date(cita.fecha_hora);
      const diferenciaMinutos = Math.floor((fechaCita - ahora) / (1000 * 60));
      
      if (diferenciaMinutos <= 5 && diferenciaMinutos > 0) {
        mostrarNotificacionCita(cita, diferenciaMinutos);
      }
      
      if (diferenciaMinutos <= 0 && diferenciaMinutos >= -5) {
        mostrarNotificacionCitaActiva(cita);
      }
    });
  } catch (error) {
    console.error('Error al verificar citas:', error);
  }
}

function mostrarNotificacionCita(cita, minutosRestantes) {
  const notifKey = `notif_cita_${cita.id_cita}`;
  
  const notifGuardada = localStorage.getItem(notifKey);
  if (notifGuardada) {
    const fechaNotif = new Date(notifGuardada);
    const ahora = new Date();
    const horasPasadas = (ahora - fechaNotif) / (1000 * 60 * 60);
    if (horasPasadas < 1) {
      return;
    }
  }
  
  localStorage.setItem(notifKey, new Date().toISOString());
  
  const fechaCita = new Date(cita.fecha_hora);
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 1rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: scaleIn 0.3s ease-out;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <i class="bi bi-calendar-event-fill" style="font-size: 4rem; color: #0d6efd;"></i>
      </div>
      
      <h4 style="color: #1e3a8a; text-align: center; margin-bottom: 1rem;">
        Recordatorio de Cita
      </h4>
      
      <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid #0d6efd;">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #1e3a8a;">
          ${cita.motivo}
        </p>
        <p style="margin: 0; color: #64748b;">
          <i class="bi bi-clock"></i> ${fechaCita.toLocaleDateString()} - ${fechaCita.toLocaleTimeString()}
        </p>
        <p style="margin: 0.5rem 0 0 0; color: #dc3545; font-weight: 600;">
          Comienza en ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-primary" id="btnEntendidoCita" style="min-width: 150px;">
          <i class="bi bi-check-circle"></i> Entendido
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('btnEntendidoCita').addEventListener('click', () => {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => modal.remove(), 300);
    }
  });
}

function mostrarNotificacionCitaActiva(cita) {
  const notifKey = `notif_activa_${cita.id_cita}`;
  
  const notifGuardada = localStorage.getItem(notifKey);
  if (notifGuardada) {
    const fechaNotif = new Date(notifGuardada);
    const ahora = new Date();
    const horasPasadas = (ahora - fechaNotif) / (1000 * 60 * 60);
    if (horasPasadas < 1) {
      return;
    }
  }
  
  localStorage.setItem(notifKey, new Date().toISOString());
  
  const fechaCita = new Date(cita.fecha_hora);
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 1rem; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: scaleIn 0.3s ease-out;">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <i class="bi bi-alarm-fill" style="font-size: 4rem; color: #dc3545;"></i>
      </div>
      
      <h4 style="color: #dc3545; text-align: center; margin-bottom: 1rem;">
        Es hora de tu cita
      </h4>
      
      <div style="background: #fef2f2; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border-left: 4px solid #dc3545;">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #dc3545;">
          ${cita.motivo}
        </p>
        <p style="margin: 0; color: #64748b;">
          <i class="bi bi-clock"></i> ${fechaCita.toLocaleDateString()} - ${fechaCita.toLocaleTimeString()}
        </p>
        <p style="margin: 0.5rem 0 0 0; color: #dc3545; font-weight: 600;">
          La cita es AHORA
        </p>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-danger" id="btnConfirmarCita" style="min-width: 150px;">
          <i class="bi bi-check-circle"></i> Confirmar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('btnConfirmarCita').addEventListener('click', () => {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => modal.remove(), 300);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => modal.remove(), 300);
    }
  });
}

function limpiarNotificacionesAntiguas() {
  const keys = Object.keys(localStorage);
  const ahora = new Date();
  
  keys.forEach(key => {
    if (key.startsWith('notif_cita_') || key.startsWith('notif_activa_')) {
      const valor = localStorage.getItem(key);
      if (valor && valor.includes('-')) {
        const fechaNotif = new Date(valor);
        const diasPasados = (ahora - fechaNotif) / (1000 * 60 * 60 * 24);
        if (diasPasados > 1) {
          localStorage.removeItem(key);
        }
      }
    }
  });
}