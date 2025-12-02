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

// Estilos CSS para animaciones
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
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

// Sistema de notificaciones toast
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

// Modal de confirmación
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

// Modal de prompt (entrada de texto)
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

// Modal de alerta simple
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
      }
    });
  });

  cargarEstadisticasInicio();
});

// ===============================
// CERRAR SESIÓN
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");
  if (cerrarSesionBtn) {
    cerrarSesionBtn.addEventListener("click", async () => {
      const confirmado = await mostrarConfirmacion(
        'Cerrar Sesión',
        'Estás a punto de cerrar tu sesión. Deberás iniciar sesión nuevamente para acceder.'
      );
      
      if (confirmado) {
        localStorage.removeItem('usuario');
        mostrarNotificacion('Sesión cerrada exitosamente', 'success');
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
    document.querySelector('.bg-primary h3').textContent = recetas.length;

    const citasRes = await fetch(`${API_URL}/citas/${idUsuario}`);
    const citas = await citasRes.json();
    const citasProximas = citas.filter(c => new Date(c.fecha_hora) > new Date());
    document.querySelector('.bg-success h3').textContent = citasProximas.length;

    const recompensasRes = await fetch(`${API_URL}/recompensas/${idUsuario}`);
    const recompensas = await recompensasRes.json();
    document.querySelector('.bg-warning h3').textContent = recompensas.puntos_totales || 0;
    document.querySelector('.bg-info h3').textContent = `${recompensas.porcentaje_cumplimiento || 0}%`;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

// ===============================
// BOTÓN EMERGENCIA EN INICIO → IR A SECCIÓN EMERGENCIA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const btnEmergenciaInicio = document.querySelector('.card.bg-danger .btn-light');
  
  if (btnEmergenciaInicio) {
    btnEmergenciaInicio.addEventListener("click", () => {
      const emergenciaNavBtn = document.querySelector('.nav-btn[data-section="emergencia"]');
      if (emergenciaNavBtn) {
        emergenciaNavBtn.click();
      }
    });
  }
});
// ===============================
// SECCIÓN: EMERGENCIA
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const emergenciaBtn = document.getElementById("emergenciaBtn");
  if (emergenciaBtn) {
    emergenciaBtn.addEventListener("click", async () => {
      const confirmado = await mostrarConfirmacion(
        'Activar Emergencia',
        'Estás a punto de activar el protocolo de emergencia. Se notificará a tus contactos de emergencia y se compartirá tu ubicación.'
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

// ===============================
// CARGAR CONTACTOS DE EMERGENCIA
// ===============================
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

// ===============================
// HISTORIAL DE EMERGENCIAS
// ===============================
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
            ${e.ubicacion_lat ? `<br><small class="text-muted"><i class="bi bi-geo-alt"></i> Ubicación compartida</small>` : ''}
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
    'Motivo de la cancelación (opcional):',
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
// RECONOCIMIENTO DE VOZ PARA EMERGENCIA
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
    vozStatus.innerHTML = `<div class="alert alert-secondary mt-3">Escuché: <strong>"${transcript}"</strong></div>`;
    
    if (transcript.includes("emergencia") || 
        transcript.includes("sos") || 
        transcript.includes("ayuda") || 
        transcript.includes("auxilio")) {
      
      vozStatus.innerHTML = '<div class="alert alert-danger mt-3"><strong>EMERGENCIA DETECTADA POR VOZ</strong></div>';
      
      setTimeout(async () => {
        const confirmado = await mostrarConfirmacion(
          'Emergencia Detectada',
          'Se detectó una palabra de emergencia por voz. ¿Deseas activar el protocolo de emergencia?'
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
      case 'no-speech': errorMsg = "No se detectó voz"; break;
      case 'audio-capture': errorMsg = "No se pudo acceder al micrófono"; break;
      case 'not-allowed': errorMsg = "Permiso de micrófono denegado"; break;
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
// ===============================
// SECCIÓN: RECETAS MÉDICAS
// ===============================
async function cargarRecetas() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await response.json();
    
    const tbody = document.querySelector('#recetas table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    recetas.forEach(receta => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(receta.fecha_subida).toLocaleDateString()}</td>
        <td>${receta.nombre_medicamento}</td>
        <td>${receta.dosis}</td>
        <td>${receta.frecuencia}</td>
        <td>
          <button class="btn btn-sm btn-info" onclick="verReceta(${receta.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="eliminarReceta(${receta.id})"><i class="bi bi-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar recetas:', error);
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
      <h5 style="margin-bottom:1.5rem;color:#1e3a8a">Nueva Receta Médica</h5>
      
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
    '¿Estás seguro de que deseas eliminar esta receta? Esta acción no se puede deshacer.'
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
  mostrarAlerta('Información', 'Funcionalidad de ver receta - ID: ' + id);
}
// ===============================
// HISTORIAL DE MEDICACIÓN
// ===============================
async function cargarHistorialMedicacion() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await response.json();
    
    const historialContainer = document.getElementById('historialMedicacion');
    if (!historialContainer) return;
    
    historialContainer.innerHTML = '';
    
    if (recetas.length === 0) {
      historialContainer.innerHTML = '<p class="text-muted">No hay historial de medicación</p>';
      return;
    }
    
    // Agrupar por mes
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

// Exportar historial a PDF (básico)
async function exportarHistorialPDF() {
  const idUsuario = getUsuarioId();
  
  try {
    const response = await fetch(`${API_URL}/recetas/${idUsuario}`);
    const recetas = await response.json();
    
    let contenido = 'HISTORIAL DE MEDICACIÓN\n\n';
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
      listGroup.innerHTML = '<div class="list-group-item">No hay citas próximas</div>';
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
    '¿Estás seguro de que deseas cancelar esta cita médica?'
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
// SECCIÓN: RECOMPENSAs
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

async function registrarCumplimiento() {
  const idUsuario = getUsuarioId();
  
  try {
    await fetch(`${API_URL}/registrarCumplimiento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: idUsuario })
    });
    cargarRecompensas();
    cargarEstadisticasInicio();
  } catch (error) {
    console.error('Error:', error);
  }
}