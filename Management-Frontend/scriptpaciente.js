// ============================================
// CONFIGURACIÓN DE LA API Y SEGURIDAD
// ============================================
const API_URL = 'http://localhost:3000';

// Configuración de sesión
const SESSION_CONFIG = {
  timeout: 30 * 60 * 1000, // 30 minutos de inactividad
  warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
  checkInterval: 30 * 1000, // Verificar cada 30 segundos
  rememberMeDuration: 7 * 24 * 60 * 60 * 1000 // 7 días si "Recordarme" está activo
};

// Variables de control de sesión
let sessionTimer = null;
let warningTimer = null;
let countdownInterval = null;
let lastActivity = Date.now();
let isWarningShown = false;

function getUsuarioId() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  return usuario.id || null;
}

function getAuthToken() {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

function isRememberMeActive() {
  return localStorage.getItem('remember_me') === 'true';
}

// ============================================
// SISTEMA DE GESTIÓN DE SESIÓN SEGURA
// ============================================

// Verificar autenticación al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  // Mostrar loading overlay
  const loadingOverlay = document.getElementById('authLoadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('d-none');
    loadingOverlay.classList.add('d-flex');
  }

  try {
    // Verificar si hay token de autenticación
    const token = getAuthToken();
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (!token || !usuario || !usuario.id) {
      throw new Error('No hay sesión activa');
    }

    // Verificar token con el servidor
    const response = await fetch(`${API_URL}/verificar-sesion`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId: usuario.id })
    });

    if (!response.ok) {
      throw new Error('Sesión inválida o expirada');
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.message || 'Error de autenticación');
    }

    // Token válido, iniciar sistema de sesión
    iniciarSistemaSesion();
    
    // Ocultar loading overlay
    if (loadingOverlay) {
      loadingOverlay.classList.remove('d-flex');
      loadingOverlay.classList.add('d-none');
    }

  } catch (error) {
    console.error('Error de autenticación:', error);
    
    // Limpiar datos de sesión
    limpiarDatosSesion();
    
    // Mostrar error y redirigir
    mostrarErrorAutenticacion('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 3000);
  }
});

function limpiarDatosSesion() {
  localStorage.removeItem('usuario');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  localStorage.removeItem('session_start');
  sessionStorage.removeItem('auth_token');
}

function mostrarErrorAutenticacion(mensaje) {
  const toast = document.getElementById('authErrorToast');
  const messageSpan = document.getElementById('authErrorMessage');
  
  if (messageSpan) {
    messageSpan.textContent = mensaje;
  }
  
  if (toast) {
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  } else {
    // Fallback si no existe el toast
    alert(mensaje);
  }
}

function iniciarSistemaSesion() {
  // Registrar actividad del usuario
  registrarActividadUsuario();
  
  // Iniciar monitoreo de sesión
  iniciarMonitoreoSesion();
  
  // Configurar renovación automática si es necesario
  if (isRememberMeActive()) {
    iniciarRenovacionAutomatica();
  }
}

function registrarActividadUsuario() {
  // Eventos que indican actividad del usuario
  const eventosActividad = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'mousemove'];
  
  eventosActividad.forEach(evento => {
    document.addEventListener(evento, actualizarUltimaActividad, { passive: true });
  });
}

function actualizarUltimaActividad() {
  lastActivity = Date.now();
  
  // Si se estaba mostrando la advertencia, cerrarla
  if (isWarningShown) {
    cerrarAdvertenciaSesion();
  }
}

function iniciarMonitoreoSesion() {
  // Limpiar timers existentes
  if (sessionTimer) clearInterval(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  
  const duracionSesion = isRememberMeActive() ? SESSION_CONFIG.rememberMeDuration : SESSION_CONFIG.timeout;
  
  // Timer para verificar inactividad
  sessionTimer = setInterval(() => {
    const tiempoInactivo = Date.now() - lastActivity;
    const tiempoRestante = duracionSesion - tiempoInactivo;
    
    if (tiempoRestante <= 0) {
      // Sesión expirada
      cerrarSesionPorExpiracion();
    } else if (tiempoRestante <= SESSION_CONFIG.warningTime && !isWarningShown) {
      // Mostrar advertencia
      mostrarAdvertenciaSesion(tiempoRestante);
    }
  }, SESSION_CONFIG.checkInterval);
}

function mostrarAdvertenciaSesion(tiempoRestanteMs) {
  isWarningShown = true;
  
  const modal = document.getElementById('sessionWarningModal');
  const countdownSpan = document.getElementById('sessionCountdown');
  
  if (!modal) return;
  
  // Mostrar modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  
  // Iniciar countdown
  let segundosRestantes = Math.ceil(tiempoRestanteMs / 1000);
  
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    segundosRestantes--;
    
    if (segundosRestantes <= 0) {
      clearInterval(countdownInterval);
      cerrarSesionPorExpiracion();
      return;
    }
    
    const minutos = Math.floor(segundosRestantes / 60);
    const segundos = segundosRestantes % 60;
    
    if (countdownSpan) {
      countdownSpan.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }
  }, 1000);
  
  // Configurar botones
  const extendBtn = document.getElementById('extendSessionBtn');
  const logoutBtn = document.getElementById('logoutNowBtn');
  
  if (extendBtn) {
    extendBtn.onclick = () => {
      extenderSesion();
      bsModal.hide();
    };
  }
  
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      bsModal.hide();
      cerrarSesion();
    };
  }
  
  // Cerrar modal al hacer clic fuera
  modal.addEventListener('hidden.bs.modal', () => {
    if (isWarningShown) {
      // Si se cerró sin extender, verificar si aún hay tiempo
      const tiempoInactivo = Date.now() - lastActivity;
      const duracionSesion = isRememberMeActive() ? SESSION_CONFIG.rememberMeDuration : SESSION_CONFIG.timeout;
      
      if (tiempoInactivo >= duracionSesion - SESSION_CONFIG.warningTime) {
        cerrarSesionPorExpiracion();
      }
    }
  });
}

function cerrarAdvertenciaSesion() {
  isWarningShown = false;
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  const modal = document.getElementById('sessionWarningModal');
  if (modal) {
    const bsModal = bootstrap.Modal.getInstance(modal);
    if (bsModal) {
      bsModal.hide();
    }
  }
}

function extenderSesion() {
  isWarningShown = false;
  lastActivity = Date.now();
  
  // Renovar token en el servidor
  renovarToken().then(nuevoToken => {
    if (nuevoToken) {
      // Guardar nuevo token
      if (isRememberMeActive()) {
        localStorage.setItem('auth_token', nuevoToken);
      } else {
        sessionStorage.setItem('auth_token', nuevoToken);
      }
      
      mostrarNotificacion('Sesión extendida exitosamente', 'success');
    }
  }).catch(error => {
    console.error('Error al extender sesión:', error);
    mostrarNotificacion('Error al extender la sesión', 'error');
  });
}

async function renovarToken() {
  try {
    const token = getAuthToken();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    const response = await fetch(`${API_URL}/renovar-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId: usuario.id })
    });
    
    if (!response.ok) {
      throw new Error('Error al renovar token');
    }
    
    const data = await response.json();
    return data.token;
    
  } catch (error) {
    console.error('Error al renovar token:', error);
    return null;
  }
}

function iniciarRenovacionAutomatica() {
  // Renovar token cada 6 horas si "Recordarme" está activo
  setInterval(() => {
    renovarToken().then(nuevoToken => {
      if (nuevoToken) {
        localStorage.setItem('auth_token', nuevoToken);
        console.log('Token renovado automáticamente');
      }
    });
  }, 6 * 60 * 60 * 1000); // Cada 6 horas
}

function cerrarSesionPorExpiracion() {
  limpiarDatosSesion();
  
  // Limpiar timers
  if (sessionTimer) clearInterval(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);
  
  mostrarErrorAutenticacion('Tu sesión ha expirado por inactividad. Por seguridad, debes iniciar sesión nuevamente.');
  
  setTimeout(() => {
    window.location.href = "../index.html?expired=1";
  }, 3000);
}

async function cerrarSesion() {
  try {
    const token = getAuthToken();
    
    // Notificar al servidor sobre el cierre de sesión
    if (token) {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    }
  } catch (error) {
    console.error('Error al cerrar sesión en servidor:', error);
  } finally {
    limpiarDatosSesion();
    
    // Limpiar timers
    if (sessionTimer) clearInterval(sessionTimer);
    if (warningTimer) clearTimeout(warningTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    
    mostrarNotificacion('Sesión cerrada exitosamente', 'success');
    
    setTimeout(() => {
      window.location.href = "../index.html";
    }, 1000);
  }
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
        if (sectionId === 'horarios') {
          cargarMedicamentosParaHorarios();
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
          window.location.href = "../index.html";
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
  const modalHTML = `
    <div class="modal fade" id="modalReceta" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Nueva Receta Medica</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Medicamento:</label>
              <input type="text" id="modalNombre" class="form-control" placeholder="Nombre del medicamento">
            </div>
            <div class="mb-3">
              <label class="form-label">Dosis:</label>
              <input type="text" id="modalDosis" class="form-control" placeholder="Ej: 400mg">
            </div>
            <div class="mb-3">
              <label class="form-label">Frecuencia:</label>
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
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnGuardarReceta">Guardar Receta</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modalElement = document.getElementById('modalReceta');
  const modal = new bootstrap.Modal(modalElement);
  modal.show();

  document.getElementById('modalNombre').focus();

  document.getElementById('btnGuardarReceta').addEventListener('click', async () => {
    // No Historia HU-24 - Como paciente, quiero subir mis recetas médicas para facilitar el pedido.
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
      modal.hide();
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
      });
      cargarRecetas();
      cargarHistorialMedicacion();

      await registrarMedicamento(nombre, dosis, frecuencia);
    } catch (error) {
      console.error('Error:', error);
      mostrarNotificacion('Error al guardar la receta', 'error');
    }
  });

  modalElement.addEventListener('hidden.bs.modal', () => {
    modalElement.remove();
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
  
  // Cargar horarios personalizados y configurar notificaciones
  cargarYConfigurarNotificacionesPersonalizadas();
  
  // Recargar cada hora por si hay cambios
  setInterval(() => {
    cargarYConfigurarNotificacionesPersonalizadas();
  }, 3600000); // Cada hora
}

async function cargarYConfigurarNotificacionesPersonalizadas() {
  const idUsuario = getUsuarioId();
  
  try {
    // Intentar cargar horarios personalizados primero
    const response = await fetch(`${API_URL}/horarios-usuario/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error('Error al cargar horarios personalizados');
    }
    
    const horarios = await response.json();
    
    console.log('Horarios personalizados cargados:', horarios);
    
    if (horarios.length > 0) {
      // Usar horarios personalizados
      horarios.forEach(horario => {
        configurarNotificacionMedicamentoPersonalizado(horario);
      });
    } else {
      // Fallback: usar frecuencias genéricas de recetas
      console.log('No hay horarios personalizados, usando frecuencias genéricas');
      const recetasResponse = await fetch(`${API_URL}/recetas/${idUsuario}`);
      const recetas = await recetasResponse.json();
      recetas.forEach(receta => {
        configurarNotificacionMedicamentoGenerico(receta);
      });
    }
    
  } catch (error) {
    console.error('Error al cargar horarios para notificaciones:', error);
  }
}

function configurarNotificacionMedicamentoPersonalizado(horario) {
  // Verificar si las notificaciones están activas para este medicamento
  if (horario.notificaciones_activas === false) {
    console.log(`Notificaciones desactivadas para ${horario.nombre_medicamento}`);
    return;
  }

  const horaParts = horario.hora.split(':');
  const hora = parseInt(horaParts[0]);
  const minutos = parseInt(horaParts[1]);
  
  const ahora = new Date();
  const horaNotificacion = new Date();
  horaNotificacion.setHours(hora, minutos, 0, 0);
  
  // Ajustar minutos de anticipación
  const minutosAnticipacion = horario.minutos_anticipacion || 15;
  horaNotificacion.setMinutes(horaNotificacion.getMinutes() - minutosAnticipacion);
  
  // Si la hora ya pasó hoy, programar para mañana
  if (horaNotificacion <= ahora) {
    horaNotificacion.setDate(horaNotificacion.getDate() + 1);
  }
  
  const msHastaNotificacion = horaNotificacion - ahora;
  
  console.log(`Programando notificación para ${horario.nombre_medicamento} a las ${horario.hora} (en ${Math.round(msHastaNotificacion/1000/60)} minutos)`);
  
  // Programar notificación única
  const timeoutId = setTimeout(() => {
    mostrarNotificacionMedicamento({
      id: horario.id_receta,
      nombre_medicamento: horario.nombre_medicamento,
      dosis: horario.dosis,
      hora: horario.hora
    });
    
    // Reprogramar para el siguiente día
    configurarNotificacionMedicamentoPersonalizado(horario);
  }, msHastaNotificacion);
  
  intervalosNotificaciones.push(timeoutId);
}

function configurarNotificacionMedicamentoGenerico(receta) {
  // Extraer frecuencia en minutos
  const frecuenciaMinutos = extraerFrecuenciaMinutos(receta.frecuencia);
  
  if (!frecuenciaMinutos || frecuenciaMinutos <= 0) {
    console.log(`No se pudo determinar frecuencia para ${receta.nombre_medicamento}`);
    return;
  }
  
  console.log(`Configurando notificación genérica para ${receta.nedicamento} cada ${frecuenciaMinutos} minutos`);
  
  // Crear intervalo para este medicamento
  const intervalo = setInterval(() => {
    mostrarNotificacionMedicamento(receta);
  }, frecuenciaMinutos * 60 * 1000);
  
  intervalosNotificaciones.push(intervalo);
}

// Función para compatibilidad hacia atrás
function configurarNotificacionMedicamento(receta) {
  configurarNotificacionMedicamentoGenerico(receta);
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
    <div class="tema-item" data-tema="${tema.id}" onclick='seleccionarTema("${tema.id}", ${JSON.stringify(tema.colores)})'>
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

function aplicarTemaPorId(temaId) {
  const temasColores = {
    'azul': ['#0d6efd', '#1e3a8a', '#3b82f6', '#dbeafe'],
    'verde': ['#10b981', '#065f46', '#34d399', '#d1fae5'],
    'morado': ['#8b5cf6', '#5b21b6', '#a78bfa', '#ede9fe'],
    'naranja': ['#f97316', '#c2410c', '#fb923c', '#fed7aa'],
    'rosa': ['#ec4899', '#be185d', '#f472b6', '#fce7f3'],
    'oscuro': ['#3b82f6', '#1e293b', '#60a5fa', '#0f172a']
  };
  
  const colores = temasColores[temaId];
  if (colores) {
    aplicarTema(colores);
  }
}

async function guardarPersonalizacion() {

  try {
    localStorage.setItem('avatar_usuario', avatarActual);
    localStorage.setItem('tema_usuario', temaActual);
    
    // Aplicar el tema usando el ID guardado
    aplicarTemaPorId(temaActual);
    
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
    const avatarGuardado = localStorage.getItem('avatar_usuario');
    const temaGuardado = localStorage.getItem('tema_usuario');
    
    if (avatarGuardado) {
      const avatarElement = document.querySelector(`[data-avatar="${avatarGuardado}"]`);
      if (avatarElement) {
        avatarElement.click();
      }
    }
    
    if (temaGuardado) {
      const temaElement = document.querySelector(`[data-tema="${temaGuardado}"]`);
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

// ============================================
// SISTEMA DE CONFIGURACIÓN DE HORARIOS DE MEDICAMENTOS
// ============================================

let recetaActualHorarios = null;
let horariosTemporales = [];

// Cargar medicamentos para la sección de horarios
async function cargarMedicamentosParaHorarios() {
  const idUsuario = getUsuarioId();
  const listaContainer = document.getElementById('listaMedicamentosHorarios');
  
  console.log('Cargando medicamentos para horarios. Usuario ID:', idUsuario);
  
  if (!listaContainer) {
    console.error('No se encontró el contenedor listaMedicamentosHorarios');
    return;
  }
  
  if (!idUsuario) {
    console.error('No se encontró ID de usuario');
    listaContainer.innerHTML = '<div class="list-group-item text-center text-danger">Error: No se identificó al usuario</div>';
    return;
  }
  
  listaContainer.innerHTML = '<div class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary me-2"></div> Cargando medicamentos...</div>';
  
  try {
    console.log('Fetching recetas from:', `${API_URL}/recetas/${idUsuario}`);
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const recetas = await response.json();
    console.log('Recetas recibidas:', recetas);
    
    listaContainer.innerHTML = '';
    
    if (!recetas || recetas.length === 0) {
      listaContainer.innerHTML = `
        <div class="list-group-item text-center text-muted py-4">
          <i class="bi bi-capsule" style="font-size: 2rem;"></i>
          <p class="mt-2 mb-0">No tienes medicamentos registrados</p>
          <small class="text-muted">Agrega medicamentos en la sección de Recetas Médicas</small>
        </div>
      `;
      return;
    }
    
    // Cargar horarios para cada medicamento
    for (const receta of recetas) {
      try {
        console.log(`Cargando horarios para receta ${receta.id}:`, receta.nombre_medicamento);
        const horariosResponse = await fetch(`${API_URL}/horarios/${receta.id}?id_usuario=${idUsuario}`);
        
        if (!horariosResponse.ok) {
          console.warn(`Error al cargar horarios para receta ${receta.id}:`, horariosResponse.status);
        }
        
        const horariosData = await horariosResponse.json();
        console.log(`Horarios para ${receta.nombre_medicamento}:`, horariosData);
        
        const tieneHorarios = horariosData.horarios && horariosData.horarios.length > 0;
        const horariosTexto = tieneHorarios 
          ? horariosData.horarios.map(h => h.hora.substring(0, 5)).join(', ')
          : '<span class="text-warning"><i class="bi bi-exclamation-circle"></i> Sin horarios configurados</span>';
        
        const div = document.createElement('div');
        div.className = 'list-group-item';
        div.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <i class="bi bi-capsule ${tieneHorarios ? 'text-success' : 'text-muted'} me-2"></i>
              <strong>${receta.nombre_medicamento}</strong>
              <br>
              <small class="text-muted">${receta.dosis} - ${receta.frecuencia}</small>
              <br>
              <small class="${tieneHorarios ? 'text-primary' : 'text-warning'}">
                <i class="bi bi-clock"></i> ${horariosTexto}
              </small>
            </div>
            <button class="btn btn-sm ${tieneHorarios ? 'btn-outline-primary' : 'btn-primary'}" onclick="configurarHorariosMedicamento(${receta.id}, '${receta.nombre_medicamento}', '${receta.dosis}')">
              <i class="bi bi-gear-fill"></i> ${tieneHorarios ? 'Editar' : 'Configurar'}
            </button>
          </div>
        `;
        listaContainer.appendChild(div);
      } catch (recetaError) {
        console.error(`Error al procesar receta ${receta.id}:`, recetaError);
        // Mostrar el medicamento sin información de horarios
        const div = document.createElement('div');
        div.className = 'list-group-item';
        div.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <i class="bi bi-capsule text-muted me-2"></i>
              <strong>${receta.nombre_medicamento}</strong>
              <br>
              <small class="text-muted">${receta.dosis} - ${receta.frecuencia}</small>
              <br>
              <small class="text-danger"><i class="bi bi-exclamation-triangle"></i> Error al cargar horarios</small>
            </div>
            <button class="btn btn-sm btn-primary" onclick="configurarHorariosMedicamento(${receta.id}, '${receta.nombre_medicamento}', '${receta.dosis}')">
              <i class="bi bi-gear-fill"></i> Configurar
            </button>
          </div>
        `;
        listaContainer.appendChild(div);
      }
    }
    
  } catch (error) {
    console.error('Error al cargar medicamentos para horarios:', error);
    listaContainer.innerHTML = `
      <div class="list-group-item text-center text-danger py-4">
        <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem;"></i>
        <p class="mt-2 mb-0">Error al cargar medicamentos</p>
        <small class="text-muted">${error.message}</small>
        <br>
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="cargarMedicamentosParaHorarios()">
          <i class="bi bi-arrow-clockwise"></i> Reintentar
        </button>
      </div>
    `;
  }
}


// Abrir modal para configurar horarios de un medicamento
async function configurarHorariosMedicamento(idReceta, nombreMedicamento, dosis) {
  recetaActualHorarios = { id: idReceta, nombre: nombreMedicamento, dosis: dosis };
  horariosTemporales = [];
  
  // Actualizar información en el modal
  document.getElementById('nombreMedicamentoHorario').textContent = nombreMedicamento;
  document.getElementById('dosisMedicamentoHorario').textContent = dosis;
  
  // Cargar horarios existentes
  const idUsuario = getUsuarioId();
  try {
    const response = await fetch(`${API_URL}/horarios/${idReceta}?id_usuario=${idUsuario}`);
    const data = await response.json();
    
    // Limpiar contenedor
    const contenedor = document.getElementById('contenedorHorarios');
    contenedor.innerHTML = '';
    
    // Agregar horarios existentes
    if (data.horarios && data.horarios.length > 0) {
      data.horarios.forEach(h => {
        agregarCampoHorario(h.hora.substring(0, 5));
      });
    } else {
      // Agregar campo vacío por defecto
      agregarCampoHorario();
    }
    
    // Configurar opciones
    if (data.configuracion) {
      document.getElementById('minutosAnticipacion').value = data.configuracion.minutos_anticipacion || 15;
      document.getElementById('notificacionesActivas').checked = data.configuracion.notificaciones_activas !== false;
      document.getElementById('notasHorario').value = data.configuracion.notas || '';
      
      // Configurar días de la semana
      const diasSemana = data.configuracion.dias_semana || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(dia => {
        const checkbox = document.getElementById(`dia-${dia}`);
        if (checkbox) {
          checkbox.checked = diasSemana.includes(dia);
        }
      });
    }
    
    // Ocultar alerta de conflictos
    document.getElementById('alertaConflictos').classList.add('d-none');
    
  } catch (error) {
    console.error('Error al cargar horarios:', error);
    agregarCampoHorario(); // Agregar campo vacío en caso de error
  }
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modalHorarios'));
  modal.show();
}

// Agregar campo de horario al modal
function agregarCampoHorario(horaInicial = '') {
  const contenedor = document.getElementById('contenedorHorarios');
  const id = `horario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const div = document.createElement('div');
  div.className = 'input-group mb-2 horario-item';
  div.id = id;
  div.innerHTML = `
    <span class="input-group-text"><i class="bi bi-clock"></i></span>
    <input type="time" class="form-control horario-input" value="${horaInicial}" required>
    <button type="button" class="btn btn-outline-danger" onclick="eliminarCampoHorario('${id}')">
      <i class="bi bi-trash"></i>
    </button>
  `;
  
  contenedor.appendChild(div);
  
  // Validar conflictos cuando cambie el valor
  const input = div.querySelector('.horario-input');
  input.addEventListener('change', validarConflictosHorariosTemporales);
}

// Eliminar campo de horario
function eliminarCampoHorario(id) {
  const elemento = document.getElementById(id);
  if (elemento) {
    elemento.remove();
    validarConflictosHorariosTemporales();
  }
}

// Validar conflictos entre horarios temporales
async function validarConflictosHorariosTemporales() {
  const inputs = document.querySelectorAll('.horario-input');
  const horarios = Array.from(inputs).map(input => input.value).filter(v => v !== '');
  
  if (horarios.length === 0) return;
  
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/validar-conflictos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: idUsuario,
        horarios_propuestos: horarios,
        id_receta_excluir: recetaActualHorarios?.id
      })
    });
    
    const data = await response.json();
    const alerta = document.getElementById('alertaConflictos');
    const lista = document.getElementById('listaConflictos');
    
    if (data.tiene_conflictos) {
      alerta.classList.remove('d-none');
      lista.innerHTML = data.conflictos.map(c => `
        <li>
          <strong>${c.hora_propuesta}</strong> está muy cerca de 
          <strong>${c.hora_existente}</strong> (${c.medicamento_existente}) - 
          Diferencia: ${c.diferencia_minutos} minutos
        </li>
      `).join('');
    } else {
      alerta.classList.add('d-none');
    }
    
  } catch (error) {
    console.error('Error al validar conflictos:', error);
  }
}

// Guardar configuración de horarios
async function guardarConfiguracionHorarios() {
  if (!recetaActualHorarios) {
    console.error('Error: No hay receta seleccionada');
    mostrarNotificacion('Error: No se ha seleccionado un medicamento', 'error');
    return;
  }
  
  const inputs = document.querySelectorAll('.horario-input');
  const horarios = Array.from(inputs).map(input => input.value).filter(v => v !== '');
  
  console.log('Horarios a guardar:', horarios);
  
  if (horarios.length === 0) {
    mostrarNotificacion('Debe agregar al menos un horario', 'warning');
    return;
  }
  
  // Obtener días seleccionados
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    .filter(dia => document.getElementById(`dia-${dia}`)?.checked);
  
  console.log('Días seleccionados:', diasSemana);
  
  if (diasSemana.length === 0) {
    mostrarNotificacion('Debe seleccionar al menos un día de la semana', 'warning');
    return;
  }
  
  const configuracion = {
    notificaciones_activas: document.getElementById('notificacionesActivas').checked,
    minutos_anticipacion: parseInt(document.getElementById('minutosAnticipacion').value),
    dias_semana: diasSemana,
    notas: document.getElementById('notasHorario').value
  };
  
  const idUsuario = getUsuarioId();
  
  console.log('Guardando horarios:', {
    id_receta: recetaActualHorarios.id,
    id_usuario: idUsuario,
    horarios: horarios,
    configuracion: configuracion
  });
  
  try {
    const response = await fetch(`${API_URL}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_receta: recetaActualHorarios.id,
        id_usuario: idUsuario,
        horarios: horarios,
        configuracion: configuracion
      })
    });
    
    console.log('Respuesta del servidor:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('Datos de respuesta:', data);
    
    if (response.ok) {
      mostrarNotificacion('Horarios guardados correctamente', 'success');
      
      // Cerrar modal
      const modalEl = document.getElementById('modalHorarios');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
      
      // Recargar lista
      cargarMedicamentosParaHorarios();
      
      // Reiniciar sistema de notificaciones para usar nuevos horarios
      iniciarSistemaNotificacionesMedicamentos();
    } else {
      console.error('Error del servidor:', data);
      mostrarNotificacion(data.mensaje || data.error || `Error al guardar horarios (${response.status})`, 'error');
    }
    
  } catch (error) {
    console.error('Error al guardar horarios:', error);
    mostrarNotificacion('Error de conexión al guardar horarios. Verifique que el servidor esté corriendo.', 'error');
  }
}


// Modificar función de cargar medicamentos para mostrar indicadores de horarios configurados
async function cargarMedicamentosHoyConHorarios() {
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
    
    // Cargar horarios para cada medicamento
    for (const receta of recetas) {
      const horariosResponse = await fetch(`${API_URL}/horarios/${receta.id}?id_usuario=${idUsuario}`);
      const horariosData = await horariosResponse.json();
      
      const tieneHorarios = horariosData.horarios && horariosData.horarios.length > 0;
      const horariosTexto = tieneHorarios 
        ? horariosData.horarios.map(h => h.hora.substring(0, 5)).join(', ')
        : `<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> Sin horarios</span>`;
      
      const div = document.createElement('div');
      div.className = 'list-group-item';
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <i class="bi bi-capsule text-primary me-2"></i>
            <strong>${receta.nombre_medicamento}</strong>
            <br>
            <small class="text-muted">Dosis: ${receta.dosis} - ${receta.frecuencia}</small>
            <br>
            <small class="${tieneHorarios ? 'text-success' : 'text-warning'}">
              <i class="bi bi-clock"></i> Horarios: ${horariosTexto}
            </small>
          </div>
          <div>
            ${!tieneHorarios ? `<button class="btn btn-sm btn-warning me-1" onclick="configurarHorariosMedicamento(${receta.id}, '${receta.nombre_medicamento}', '${receta.dosis}')">
              <i class="bi bi-gear-fill"></i> Configurar
            </button>` : ''}
            <button class="btn btn-sm btn-success" onclick="confirmarTomaMedicamento(${receta.id}, '${receta.nombre_medicamento}')">
              <i class="bi bi-check-circle"></i> Ya tomé
            </button>
          </div>
        </div>
      `;
      listaMedicamentos.appendChild(div);
    }
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

// Sobrescribir la función original para usar la nueva versión con horarios
const cargarMedicamentosHoyOriginal = cargarMedicamentosHoy;
cargarMedicamentosHoy = cargarMedicamentosHoyConHorarios;


async function cargarAvatarYNombre() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombreUsuario = usuario.nombres || 'Usuario';
    
    const avatarGuardado = localStorage.getItem('avatar_usuario');
    const temaGuardado = localStorage.getItem('tema_usuario');
    
    const avatarHTML = obtenerAvatarSVG(avatarGuardado || 'default', '100%');
    const temaNombre = obtenerNombreTema(temaGuardado || 'azul');
    
    // Actualizar sidebar
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarUsername = document.getElementById('sidebar-username');
    const themeName = document.getElementById('theme-name');
    const themeIndicator = document.getElementById('theme-indicator');
    
    if (sidebarAvatar) sidebarAvatar.innerHTML = avatarHTML;
    if (sidebarUsername) sidebarUsername.textContent = nombreUsuario;
    if (themeName) themeName.textContent = temaNombre;
    if (themeIndicator) {
      const colorTema = obtenerColorTema(temaGuardado || 'azul');
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

// Cargar avatar y tema al iniciar - aplicar inmediatamente
document.addEventListener("DOMContentLoaded", () => {
  // Aplicar tema guardado inmediatamente
  const temaGuardado = localStorage.getItem('tema_usuario');
  if (temaGuardado) {
    aplicarTemaPorId(temaGuardado);
  }
  
  // Actualizar avatar y nombre
  actualizarAvatarEnSistema();
});
