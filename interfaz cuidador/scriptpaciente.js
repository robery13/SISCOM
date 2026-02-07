// ============================================
// CONFIGURACIÓN DE LA API
// ============================================
const API_URL = 'http://localhost:3000';

function getUsuarioId() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  return usuario.id || 1;
}

// ============================================
// SISTEMA DE MODALES  NOTIFICACIONES
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
  iniciarSistemaNotificacionesMedicamentos();
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
  <select id="modalFrecuencia" class="form-select">
    <option value="">Selecciona frecuencia</option>
    <optgroup label="Pruebas (Minutos)">
      <option value="cada 1 minuto">Cada 1 minuto</option>
      <option value="cada 2 minutos">Cada 2 minutos</option>
      <option value="cada 3 minutos">Cada 3 minutos</option>
      <option value="cada 5 minutos">Cada 5 minutos</option>
      <option value="cada 10 minutos">Cada 10 minutos</option>
      <option value="cada 15 minutos">Cada 15 minutos</option>
      <option value="cada 30 minutos">Cada 30 minutos</option>
    </optgroup>
    <optgroup label="Frecuencias Comunes (Horas)">
      <option value="cada 1 hora">Cada 1 hora</option>
      <option value="cada 2 horas">Cada 2 horas</option>
      <option value="cada 4 horas">Cada 4 horas</option>
      <option value="cada 6 horas">Cada 6 horas</option>
      <option value="cada 8 horas">Cada 8 horas</option>
      <option value="cada 12 horas">Cada 12 horas</option>
      <option value="cada 24 horas">Cada 24 horas (1 vez al día)</option>
    </optgroup>
  </select>
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

// ====================================================================
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  const citaForm = document.getElementById('citaForm');
  if (citaForm) {
    citaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      //  CORRECCIÓN: Obtener valores correctamente
      const fecha = citaForm.querySelector('input[type="date"]').value;
      const hora = citaForm.querySelector('input[type="time"]').value;
      const especialidad = document.getElementById('selectEspecialidad').value.trim(); // ✅ Especialidad del select
      const doctor = document.getElementById('selectDoctor').value.trim(); // ✅ Doctor del select
      
      // Validar que todos los campos estén completos
      if (!fecha || !hora || !especialidad || !doctor) {
        await mostrarAlerta('Campos incompletos', 'Por favor completa todos los campos');
        return;
      }
      
      // Combinar fecha y hora en formato MySQL
      const fechaHora = `${fecha} ${hora}:00`;
      
      // Crear el motivo combinando especialidad y doctor
      const motivo = `${especialidad} - ${doctor}`;
      
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
        citaForm.reset(); // Limpiar formulario
        cargarCitas(); // Recargar lista de citas
        cargarEstadisticasInicio(); // Actualizar estadísticas
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

// ============================================
// SISTEMA DE NOTIFICACIONES DE MEDICAMENTOS
// ============================================

let intervalosNotificaciones = [];

function iniciarSistemaNotificacionesMedicamentos() {
  console.log('Sistema de notificaciones de medicamentos iniciado');
  
  // Limpiar intervalos previos
  intervalosNotificaciones.forEach(intervalo => clearInterval(intervalo));
  intervalosNotificaciones = [];
  
  // Cargar medicamentos y configurar notificaciones
  cargarYConfigurarNotificaciones();
  
  // Recargar cada hora por si hay cambios
  setInterval(() => {
    cargarYConfigurarNotificaciones();
  }, 3600000); // Cada hora
}

async function cargarYConfigurarNotificaciones() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar medicamentos');
    }
    
    const recetas = await response.json();
    
    console.log('Recetas cargadas para notificaciones:', recetas);
    
    recetas.forEach(receta => {
      configurarNotificacionMedicamento(receta);
    });
    
  } catch (error) {
    console.error('Error al cargar medicamentos para notificaciones:', error);
  }
}

function configurarNotificacionMedicamento(receta) {
  // Extraer frecuencia en minutos
  const frecuenciaMinutos = extraerFrecuenciaMinutos(receta.frecuencia);
  
  if (!frecuenciaMinutos || frecuenciaMinutos <= 0) {
    console.log(`No se pudo determinar frecuencia para ${receta.nombre_medicamento}`);
    return;
  }
  
  console.log(`Configurando notificación para ${receta.nombre_medicamento} cada ${frecuenciaMinutos} minutos`);
  
  // Crear intervalo para este medicamento
  const intervalo = setInterval(() => {
    mostrarNotificacionMedicamento(receta);
  }, frecuenciaMinutos * 60 * 1000);
  
  intervalosNotificaciones.push(intervalo);
  
  // Mostrar primera notificación inmediatamente (opcional)
  // setTimeout(() => mostrarNotificacionMedicamento(receta), 5000);
}

function extraerFrecuenciaMinutos(frecuenciaTexto) {
  if (!frecuenciaTexto) return null;
  
  const texto = frecuenciaTexto.toLowerCase();
  
  // Patrones: "cada 2 horas", "cada 30 minutos", "2 minutos", "8 horas"
  
  // Buscar minutos
  const matchMinutos = texto.match(/(\d+)\s*min/i);
  if (matchMinutos) {
    return parseInt(matchMinutos[1]);
  }
  
  // Buscar horas
  const matchHoras = texto.match(/(\d+)\s*h/i);
  if (matchHoras) {
    return parseInt(matchHoras[1]) * 60;
  }
  
  // Si dice "cada X" extraer el número
  const matchCada = texto.match(/cada\s*(\d+)/i);
  if (matchCada) {
    const numero = parseInt(matchCada[1]);
    // Asumir horas si el número es pequeño (< 24)
    if (numero < 24) {
      return numero * 60;
    }
    return numero; // Asumir minutos
  }
  
  return null;
}

function mostrarNotificacionMedicamento(receta) {
  // Verificar si ya se tomó hoy
  verificarSiYaSeTomoHoy(receta.id).then(yaTomado => {
    if (yaTomado) {
      console.log(`Ya se tomó ${receta.nombre_medicamento} hoy`);
      return;
    }
    
    // Crear modal de notificación
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      animation: fadeIn 0.3s ease-out;
    `;
    
    // Reproducir sonido de notificación (opcional)
    reproducirSonidoNotificacion();
    
    const horaActual = new Date().toLocaleTimeString('es', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    modal.innerHTML = `
      <div style="background: white; padding: 2.5rem; border-radius: 1.5rem; max-width: 550px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.4); animation: scaleIn 0.4s ease-out;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4); animation: pulse 2s infinite;">
            <i class="bi bi-alarm-fill" style="font-size: 3.5rem; color: white;"></i>
          </div>
          <h3 style="color: #dc2626; margin: 0 0 0.5rem 0; font-size: 1.75rem; font-weight: 700;">
            Es hora de tu medicamento
          </h3>
          <p style="color: #64748b; margin: 0; font-size: 1.1rem;">
            ${horaActual}
          </p>
        </div>
        
        <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; border-left: 5px solid #dc2626;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <i class="bi bi-capsule-pill" style="font-size: 2.5rem; color: #dc2626;"></i>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 0.5rem 0; color: #1e3a8a; font-size: 1.4rem; font-weight: 600;">
                ${receta.nombre_medicamento}
              </h4>
              <p style="margin: 0; color: #64748b; font-size: 1rem;">
                <strong>Dosis:</strong> ${receta.dosis}
              </p>
              <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.95rem;">
                <strong>Frecuencia:</strong> ${receta.frecuencia}
              </p>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn btn-outline-secondary" id="btnPosponer" style="min-width: 150px; padding: 0.75rem 1.5rem; font-size: 1rem;">
            <i class="bi bi-clock-history"></i> Posponer 10 min
          </button>
          <button class="btn btn-success" id="btnYaTome" style="min-width: 150px; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600;">
            <i class="bi bi-check-circle-fill"></i> Ya tomé
          </button>
        </div>
        
        <p style="text-align: center; margin: 1.5rem 0 0 0; color: #94a3b8; font-size: 0.875rem;">
          <i class="bi bi-info-circle"></i> Es importante tomar tus medicamentos a tiempo
        </p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Botón "Ya tomé"
    document.getElementById('btnYaTome').addEventListener('click', async () => {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => modal.remove(), 300);
      
      // Registrar que tomó el medicamento
      await confirmarTomaMedicamento(receta.id, receta.nombre_medicamento);
      
      mostrarNotificacion(`¡Excelente! Registramos tu toma de ${receta.nombre_medicamento}`, 'success');
    });
    
    // Botón "Posponer"
    document.getElementById('btnPosponer').addEventListener('click', () => {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => modal.remove(), 300);
      
      // Posponer 10 minutos
      setTimeout(() => {
        mostrarNotificacionMedicamento(receta);
      }, 10 * 60 * 1000);
      
      mostrarNotificacion('Notificación pospuesta 10 minutos', 'info');
    });
  });
}

async function verificarSiYaSeTomoHoy(id_receta) {
  const idUsuario = getUsuarioId();
  const fechaHoy = new Date().toISOString().slice(0, 10);
  
  try {
    const response = await fetch(`${API_URL}/tomasHoy/${idUsuario}`);
    const tomas = await response.json();
    
    // Verificar si ya se tomó este medicamento hoy
    const yaTomado = tomas.some(toma => {
      return toma.fecha_toma === fechaHoy;
    });
    
    return yaTomado;
  } catch (error) {
    console.error('Error al verificar tomas:', error);
    return false;
  }
}

function reproducirSonidoNotificacion() {
  // Crear un beep simple usando Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('No se pudo reproducir sonido:', error);
  }
}
// ========================================
// MENÚ RESPONSIVE PARA MÓVILES
// ========================================
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// Abrir/cerrar menú
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  });
}

// Cerrar menú al hacer clic en el overlay
if (overlay) {
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });
}

// Cerrar menú en móvil después de seleccionar una opción
document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Cerrar menú en móvil después de seleccionar
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    }
  });
});
// ============================================
// FUNCIÓN GLOBAL PARA OBTENER AVATARES SVG
// ============================================
function obtenerAvatarSVG(avatarId, size = '100%') {
  const avatares = {
    'default': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#5B4D8D"/>
        <circle cx="20" cy="15" r="6" fill="white"/>
        <path d="M8 35C8 27.268 13.268 21 20 21C26.732 21 32 27.268 32 35" fill="white"/>
      </svg>
    `,
    'hombre1': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#FDB44B"/>
        <circle cx="20" cy="14" r="7" fill="#FFDA6A"/>
        <path d="M7 36C7 27.163 13.163 20 22 20C28.837 20 35 27.163 35 36" fill="#FFDA6A"/>
        <rect x="16" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
        <rect x="24" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
      </svg>
    `,
    'hombre2': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#A0AEC0"/>
        <circle cx="20" cy="14" r="7" fill="#E2E8F0"/>
        <path d="M7 36C7 27.163 13.163 20 22 20C28.837 20 35 27.163 35 36" fill="#E2E8F0"/>
        <rect x="16" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
        <rect x="24" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
      </svg>
    `,
    'mujer1': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#FDB44B"/>
        <circle cx="20" cy="14" r="7" fill="#FFDA6A"/>
        <path d="M7 36C7 27.163 13.163 20 22 20C28.837 20 35 27.163 35 36" fill="#FFDA6A"/>
        <path d="M14 12C14 10 16 8 20 8C24 8 26 10 26 12C26 13 25 14 24 14H16C15 14 14 13 14 12Z" fill="#8B5A3C"/>
        <rect x="16" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
        <rect x="24" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
      </svg>
    `,
    'mujer2': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#A0AEC0"/>
        <circle cx="20" cy="14" r="7" fill="#E2E8F0"/>
        <path d="M7 36C7 27.163 13.163 20 22 20C28.837 20 35 27.163 35 36" fill="#E2E8F0"/>
        <path d="M14 12C14 10 16 8 20 8C24 8 26 10 26 12C26 13 25 14 24 14H16C15 14 14 13 14 12Z" fill="#CBD5E0"/>
        <rect x="16" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
        <rect x="24" y="16" width="2" height="2" rx="1" fill="#2D3748"/>
      </svg>
    `,
    'medico': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#3B82F6"/>
        <circle cx="20" cy="14" r="6" fill="#FFDA6A"/>
        <path d="M8 35C8 27 13 21 20 21C27 21 32 27 32 35" fill="white"/>
        <circle cx="20" cy="12" r="2" fill="white" opacity="0.9"/>
        <rect x="19" y="13" width="2" height="6" fill="white"/>
        <rect x="16" y="15" width="8" height="2" fill="white"/>
      </svg>
    `,
    'enfermera': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#3B82F6"/>
        <circle cx="20" cy="14" r="6" fill="#FFDA6A"/>
        <path d="M8 35C8 27 13 21 20 21C27 21 32 27 32 35" fill="white"/>
        <path d="M14 10C14 8 16 7 20 7C24 7 26 8 26 10C26 11 25 12 24 12H16C15 12 14 11 14 10Z" fill="#8B5A3C"/>
        <rect x="19" y="9" width="2" height="4" fill="#EF4444"/>
        <rect x="17" y="11" width="6" height="2" fill="#EF4444"/>
      </svg>
    `,
    'mascota1': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#D97706"/>
        <circle cx="20" cy="20" r="12" fill="#F59E0B"/>
        <ellipse cx="16" cy="18" rx="2" ry="3" fill="#92400E"/>
        <ellipse cx="24" cy="18" rx="2" ry="3" fill="#92400E"/>
        <circle cx="16" cy="18" r="1" fill="white"/>
        <circle cx="24" cy="18" r="1" fill="white"/>
        <circle cx="20" cy="22" r="1.5" fill="#92400E"/>
        <path d="M20 22C20 24 18 25 18 25C18 25 20 24 20 22Z" fill="#92400E"/>
        <path d="M20 22C20 24 22 25 22 25C22 25 20 24 20 22Z" fill="#92400E"/>
        <ellipse cx="13" cy="12" rx="3" ry="5" fill="#F59E0B"/>
        <ellipse cx="27" cy="12" rx="3" ry="5" fill="#F59E0B"/>
      </svg>
    `,
    'mascota2': `
      <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="#F59E0B"/>
        <circle cx="20" cy="20" r="12" fill="#FCD34D"/>
        <circle cx="16" cy="18" r="1.5" fill="#92400E"/>
        <circle cx="24" cy="18" r="1.5" fill="#92400E"/>
        <circle cx="16" cy="18" r="0.5" fill="white"/>
        <circle cx="24" cy="18" r="0.5" fill="white"/>
        <path d="M18 23C18 23 19 24 20 24C21 24 22 23 22 23" stroke="#92400E" stroke-width="1" stroke-linecap="round"/>
        <path d="M14 15L12 10L16 12Z" fill="#FCD34D"/>
        <path d="M26 15L28 10L24 12Z" fill="#FCD34D"/>
      </svg>
    `
  };
  
  return avatares[avatarId] || avatares['default'];
}

// ============================================
// HU-29: PERSONALIZACIÓN VISUAL
// ============================================
function cargarPersonalizacion() {
  const container = document.getElementById('personalizacion-container');
  if (!container) return;

  if (container.innerHTML !== '') return;

  container.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-3 text-muted">Cargando personalización...</p>
    </div>
  `;

  setTimeout(() => {
    renderizarPersonalizacion();
  }, 500);
}

function renderizarPersonalizacion() {
  const container = document.getElementById('personalizacion-container');
  if (!container) return;

  container.innerHTML = `
    <style>
      .avatar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
      }
      
      .avatar-item {
        padding: 1.5rem 1rem;
        background: white;
        border: 3px solid #e2e8f0;
        border-radius: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
      }
      
      .avatar-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      }
      
      .avatar-item.selected {
        border-color: var(--primary);
        background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.2) 100%);
      }
      
      .avatar-svg-container {
        width: 60px;
        height: 60px;
        margin: 0 auto 0.5rem;
      }
      
      .avatar-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #64748b;
      }
      
      .tema-grid {
        display: grid;
        gap: 1rem;
        margin: 2rem 0;
      }
      
      .tema-item {
        padding: 1.5rem;
        background: white;
        border: 3px solid #e2e8f0;
        border-radius: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .tema-item:hover {
        transform: translateX(5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      
      .tema-item.selected {
        border-color: var(--primary);
        background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.2) 100%);
      }
      
      .tema-colors {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        height: 40px;
      }
      
      .tema-color {
        flex: 1;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .preview-section {
        padding: 2rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 1rem;
        margin: 2rem 0;
        text-align: center;
      }
      
      .preview-avatar {
        width: 100px;
        height: 100px;
        margin: 0 auto 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>

    <div class="row">
      <div class="col-md-6">
        <h4 class="mb-4"><i class="bi bi-person-circle"></i> Seleccionar Avatar</h4>
        
        <div class="preview-section">
          <div class="preview-avatar" id="preview-avatar">${obtenerAvatarSVG('default')}</div>
          <h5 id="preview-avatar-name">Predeterminado</h5>
          <span class="badge bg-primary">Avatar Actual</span>
        </div>
        
        <div class="avatar-grid" id="avatar-grid">
          ${generarAvatares()}
        </div>
      </div>

      <div class="col-md-6">
        <h4 class="mb-4"><i class="bi bi-palette-fill"></i> Seleccionar Tema</h4>
        
        <div class="tema-grid" id="tema-grid">
          ${generarTemas()}
        </div>
        
        <div class="mt-4">
          <label class="form-check">
            <input type="checkbox" class="form-check-input" id="vista-previa">
            <span class="form-check-label">👁️ Activar vista previa automática</span>
          </label>
        </div>
      </div>
    </div>

    <div class="d-flex gap-3 mt-4">
      <button class="btn btn-success flex-fill" onclick="guardarPersonalizacion()">
        <i class="bi bi-save"></i> Guardar Preferencias
      </button>
      <button class="btn btn-outline-secondary flex-fill" onclick="reiniciarPersonalizacion()">
        <i class="bi bi-arrow-clockwise"></i> Reiniciar
      </button>
    </div>

    <div class="alert alert-info mt-4">
      <i class="bi bi-info-circle"></i> <strong>Información:</strong>
      Tus preferencias se guardarán automáticamente y se mantendrán entre sesiones.
    </div>
  `;

  inicializarEventosPersonalizacion();
  cargarPreferenciasGuardadas();
}

function generarAvatares() {
  const avatares = [
    { id: 'default', nombre: 'Predeterminado' },
    { id: 'hombre1', nombre: 'Hombre 1' },
    { id: 'hombre2', nombre: 'Hombre Mayor' },
    { id: 'mujer1', nombre: 'Mujer 1' },
    { id: 'mujer2', nombre: 'Mujer Mayor' },
    { id: 'medico', nombre: 'Médico' },
    { id: 'enfermera', nombre: 'Enfermera' },
    { id: 'mascota1', nombre: 'Perrito' },
    { id: 'mascota2', nombre: 'Gatito' }
  ];

  return avatares.map(avatar => `
    <div class="avatar-item" data-avatar="${avatar.id}" onclick="seleccionarAvatar('${avatar.id}', '${avatar.nombre}')">
      <div class="avatar-svg-container">${obtenerAvatarSVG(avatar.id)}</div>
      <div class="avatar-name">${avatar.nombre}</div>
    </div>
  `).join('');
}

function generarTemas() {
  const temas = [
    { id: 'azul', nombre: 'Azul Clásico', colores: ['#0d6efd', '#1e3a8a', '#3b82f6', '#dbeafe'] },
    { id: 'verde', nombre: 'Verde Salud', colores: ['#10b981', '#065f46', '#34d399', '#d1fae5'] },
    { id: 'morado', nombre: 'Morado Elegante', colores: ['#8b5cf6', '#5b21b6', '#a78bfa', '#ede9fe'] },
    { id: 'naranja', nombre: 'Naranja Cálido', colores: ['#f97316', '#c2410c', '#fb923c', '#fed7aa'] },
    { id: 'rosa', nombre: 'Rosa Suave', colores: ['#ec4899', '#be185d', '#f472b6', '#fce7f3'] },
    { id: 'oscuro', nombre: 'Modo Oscuro', colores: ['#3b82f6', '#1e293b', '#60a5fa', '#0f172a'] }
  ];

  return temas.map(tema => `
    <div class="tema-item" data-tema="${tema.id}" onclick="seleccionarTema('${tema.id}', ${JSON.stringify(tema.colores).replace(/"/g, '&quot;')})">
      <div class="d-flex justify-content-between align-items-center">
        <h6 class="mb-0">${tema.nombre}</h6>
        <span class="badge bg-primary d-none tema-badge-${tema.id}">Seleccionado</span>
      </div>
      <div class="tema-colors">
        ${tema.colores.map(color => `<div class="tema-color" style="background: ${color}"></div>`).join('')}
      </div>
    </div>
  `).join('');
}

let avatarActual = 'default';
let temaActual = 'azul';

function inicializarEventosPersonalizacion() {
  document.querySelector('[data-avatar="default"]')?.classList.add('selected');
  document.querySelector('[data-tema="azul"]')?.classList.add('selected');
  document.querySelector('.tema-badge-azul')?.classList.remove('d-none');
}

function seleccionarAvatar(id, nombre) {
  avatarActual = id;
  
  document.querySelectorAll('.avatar-item').forEach(item => {
    item.classList.remove('selected');
  });
  document.querySelector(`[data-avatar="${id}"]`)?.classList.add('selected');
  
  document.getElementById('preview-avatar').innerHTML = obtenerAvatarSVG(id);
  document.getElementById('preview-avatar-name').textContent = nombre;
}

function seleccionarTema(id, colores) {
  temaActual = id;
  
  document.querySelectorAll('.tema-item').forEach(item => {
    item.classList.remove('selected');
  });
  document.querySelectorAll('[class*="tema-badge-"]').forEach(badge => {
    badge.classList.add('d-none');
  });
  
  document.querySelector(`[data-tema="${id}"]`)?.classList.add('selected');
  document.querySelector(`.tema-badge-${id}`)?.classList.remove('d-none');
  
  if (document.getElementById('vista-previa')?.checked) {
    aplicarTema(colores);
  }
}

function aplicarTema(colores) {
  const root = document.documentElement;
  root.style.setProperty('--primary', colores[0]);
  root.style.setProperty('--accent', colores[2]);
  
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.style.background = `linear-gradient(180deg, ${colores[1]} 0%, ${colores[0]} 100%)`;
  }
}

async function guardarPersonalizacion() {
  try {
    await window.storage?.set('avatar_usuario', avatarActual);
    await window.storage?.set('tema_usuario', temaActual);
    
    const temaData = document.querySelector(`[data-tema="${temaActual}"]`);
    if (temaData) {
      const coloresStr = temaData.getAttribute('onclick').match(/\[(.*?)\]/)[1];
      const colores = coloresStr.split(',').map(c => c.trim().replace(/['"]/g, ''));
      aplicarTema(colores);
    }
    
    // IMPORTANTE: Actualizar inmediatamente después de guardar
    setTimeout(() => {
      actualizarAvatarEnSistema();
    }, 100);
    
    mostrarNotificacion('Preferencias guardadas correctamente', 'success');
  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarNotificacion('Error al guardar preferencias', 'error');
  }
}

async function cargarPreferenciasGuardadas() {
  try {
    const avatarGuardado = await window.storage?.get('avatar_usuario');
    const temaGuardado = await window.storage?.get('tema_usuario');
    
    if (avatarGuardado?.value) {
      const avatarElement = document.querySelector(`[data-avatar="${avatarGuardado.value}"]`);
      if (avatarElement) {
        avatarElement.click();
      }
    }
    
    if (temaGuardado?.value) {
      const temaElement = document.querySelector(`[data-tema="${temaGuardado.value}"]`);
      if (temaElement) {
        temaElement.click();
      }
    }
  } catch (error) {
    console.log('No hay preferencias guardadas');
  }
}

function reiniciarPersonalizacion() {
  avatarActual = 'default';
  temaActual = 'azul';
  
  document.querySelector('[data-avatar="default"]')?.click();
  document.querySelector('[data-tema="azul"]')?.click();
  
  mostrarNotificacion('Configuración reiniciada', 'success');
}

// ============================================
// MOSTRAR AVATAR EN TODO EL SISTEMA
// ============================================
function actualizarAvatarEnSistema() {
  cargarAvatarYNombre();
}

async function cargarAvatarYNombre() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombreUsuario = usuario.nombres || 'Usuario';
    
    const avatarGuardado = await window.storage?.get('avatar_usuario');
    const temaGuardado = await window.storage?.get('tema_usuario');
    
    const avatarHTML = obtenerAvatarSVG(avatarGuardado?.value || 'default', '100%');
    const temaNombre = obtenerNombreTema(temaGuardado?.value || 'azul');
    
    // Actualizar sidebar
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const themeName = document.getElementById('theme-name');
    const themeIndicator = document.getElementById('theme-indicator');
    
    if (sidebarAvatar) sidebarAvatar.innerHTML = avatarHTML;
    if (sidebarUsername) sidebarUsername.textContent = nombreUsuario;
    if (themeName) themeName.textContent = temaNombre;
    if (themeIndicator) {
      const colorTema = obtenerColorTema(temaGuardado?.value || 'azul');
      const icono = themeIndicator.querySelector('i');
      if (icono) icono.style.color = colorTema;
    }
    
    // Actualizar bienvenida
    const welcomeAvatar = document.getElementById('welcome-avatar');
    const welcomeUsername = document.getElementById('welcome-username');
    
    if (welcomeAvatar) welcomeAvatar.innerHTML = avatarHTML;
    if (welcomeUsername) welcomeUsername.textContent = nombreUsuario;
    
  } catch (error) {
    console.log('Error al cargar avatar:', error);
  }
}

function obtenerNombreTema(temaId) {
  const temas = {
    'azul': 'Azul Clásico',
    'verde': 'Verde Salud',
    'morado': 'Morado Elegante',
    'naranja': 'Naranja Cálido',
    'rosa': 'Rosa Suave',
    'oscuro': 'Modo Oscuro'
  };
  return temas[temaId] || 'Azul Clásico';
}

function obtenerColorTema(temaId) {
  const colores = {
    'azul': '#0d6efd',
    'verde': '#10b981',
    'morado': '#8b5cf6',
    'naranja': '#f97316',
    'rosa': '#ec4899',
    'oscuro': '#3b82f6'
  };
  return colores[temaId] || '#0d6efd';
}

function irAPersonalizacion() {
  const btnPersonalizacion = document.querySelector('.nav-btn[data-section="personalizacion"]');
  if (btnPersonalizacion) {
    btnPersonalizacion.click();
  }
}

// Cargar avatar al iniciar
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    actualizarAvatarEnSistema();
  }, 500);
});



// ============================================
// No Historia HU-36 - FUNCIONALIDAD DE ALERTAS DE STOCK BAJO PARA CUIDADORES
// ============================================

async function verificarStockBajo() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    if (!response.ok) throw new Error('Error en API');
    
    const recetas = await response.json();
    console.log('Recetas cargadas para stock:', recetas);  // Log para depurar
    
    const alertas = [];
    recetas.forEach(receta => {
      // Asegúrate de que los campos existan (usa valores por defecto si no)
      const stockActual = receta.stock_actual || 0;
      const stockMinimo = receta.stock_minimo || 0;
      
      if (stockActual <= stockMinimo) {
        alertas.push(receta);
        mostrarNotificacion(`¡Alerta! ${receta.nombre_medicamento} está por agotarse (Stock: ${stockActual})`, 'warning');
      }
    });
    
    mostrarSugerenciasPedido(alertas);
  } catch (error) {
    console.error('Error al verificar stock:', error);
    mostrarNotificacion('Error al verificar stock de medicamentos', 'error');
  }
}

// Función para mostrar sugerencias (mejorada)
function mostrarSugerenciasPedido(alertas) {
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
  
  alertas.forEach(receta => {
    const sugerenciaCantidad = Math.max((receta.stock_minimo || 5) * 2, 30);
    
    const item = document.createElement('div');
    item.className = 'list-group-item alerta-stock-bajo';
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="mb-1 text-warning"><i class="bi bi-exclamation-triangle-fill"></i> ${receta.nombre_medicamento}</h6>
          <p class="mb-1">Stock actual: <strong>${receta.stock_actual || 0}</strong> | Mínimo: <strong>${receta.stock_minimo || 0}</strong></p>
          <div class="sugerencia-pedido">
            <strong>Sugerencia de pedido:</strong> Solicitar ${sugerenciaCantidad} unidades a la farmacia.
            <br><small>Basado en consumo estimado para 30 días.</small>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="pedirAFarmacia('${receta.nombre_medicamento}', ${sugerenciaCantidad})">
          <i class="bi bi-cart-plus"></i> Pedir
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Función para pedido (sin cambios)
function pedirAFarmacia(medicamento, cantidad) {
  mostrarNotificacion(`Pedido enviado: ${cantidad} unidades de ${medicamento} a la farmacia`, 'success');
}

// Funciones de actualización (sin cambios)
async function actualizarStock(input, idReceta) {
  const nuevoStock = parseInt(input.value);
  if (isNaN(nuevoStock) || nuevoStock < 0) {
    mostrarNotificacion('Stock inválido', 'error');
    return;
  }
  
  try {
    await fetch(`${API_URL}/recetas/${idReceta}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_actual: nuevoStock })
    });
    mostrarNotificacion('Stock actualizado', 'success');
    verificarStockBajo();
  } catch (error) {
    mostrarNotificacion('Error al actualizar stock', 'error');
  }
}

async function actualizarStockMinimo(input, idReceta) {
  const nuevoMinimo = parseInt(input.value);
  if (isNaN(nuevoMinimo) || nuevoMinimo < 0) {
    mostrarNotificacion('Mínimo inválido', 'error');
    return;
  }
  
  try {
    await fetch(`${API_URL}/recetas/${idReceta}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_minimo: nuevoMinimo })
    });
    mostrarNotificacion('Stock mínimo actualizado', 'success');
    verificarStockBajo();
  } catch (error) {
    mostrarNotificacion('Error al actualizar mínimo', 'error');
  }
}

// Integración mejorada: Llama verificarStockBajo al cargar recetas
document.addEventListener('DOMContentLoaded', () => {
  // Sobrescribe cargarRecetas para incluir verificación
  const originalCargarRecetas = window.cargarRecetas || function() {};
  window.cargarRecetas = async function() {
    await originalCargarRecetas();
    await verificarStockBajo();
  };
  
  // Llama inicial
  setTimeout(() => verificarStockBajo(), 1000);
  
  // Verificación periódica
  setInterval(verificarStockBajo, 5 * 60 * 1000);
});