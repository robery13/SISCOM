// ===============================
/* DASHBOARD ENHANCEMENTS */
// ===============================
const hasAOS = typeof window !== "undefined" && typeof window.AOS !== "undefined";
const hasChart = typeof window !== "undefined" && typeof window.Chart !== "undefined";

function obtenerTokenSesion() {
  let token = localStorage.getItem('auth_token') ||
              localStorage.getItem('token') ||
              localStorage.getItem('accessToken') ||
              sessionStorage.getItem('auth_token') ||
              sessionStorage.getItem('token');

  if (!token) {
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
      try {
        const usuario = JSON.parse(usuarioData);
        token = usuario.token || usuario.accessToken || usuario.authToken || token;
      } catch (e) {
        console.warn('No se pudo recuperar token desde localStorage.usuario', e);
      }
    }
  }

  return token;
}

function obtenerUrlPacientesSegunVista() {
  const path = String(window.location.pathname || '').toLowerCase();
  return path.includes('cuidador_backend.html')
    ? 'http://localhost:3000/mis-pacientes'
    : 'http://localhost:3000/usuarios/rol/usuario';
}

function obtenerHeadersPacientes() {
  const headers = {};
  const token = obtenerTokenSesion();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// Initialize AOS animations
if (hasAOS) {
  AOS.init({
    duration: 1000,
    once: true,
    offset: 100
  });
}

// Dark Mode Toggle
let darkMode = localStorage.getItem('darkMode') === 'enabled';
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
  const icon = darkModeToggle.querySelector('i');
  if (darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
    icon.className = 'bi bi-sun';
  }
  
  darkModeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      icon.className = 'bi bi-sun';
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.documentElement.removeAttribute('data-theme');
      icon.className = 'bi bi-moon';
      localStorage.setItem('darkMode', 'disabled');
    }
    // adjust chart colors after theme change
    if (hasChart) {
      Chart.defaults.color = getComputedStyle(document.body).color || '';
      if (window.myTrendChart) window.myTrendChart.update();
      if (window.myInventoryChart) window.myInventoryChart.update();
    }
  });
}

// Animated Counters
function animateCounter(el, target, duration = 2000) {
  if (isNaN(target) || target < 0) target = 0;
  let start = 0;
  const increment = target / (duration / 16);
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      el.textContent = target.toLocaleString();
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start).toLocaleString();
    }
  }, 16);
}

// Enhanced Dashboard Loading with Charts
async function cargarDashboard() {
  const lastUpdateEl = document.getElementById('last-update');
  
  // Skeleton loading
  document.querySelectorAll('.dashboard-kpi-card').forEach(card => {
    card.classList.add('skeleton-shimmer');
  });
  
  try {
    // attach token if available
    const token = localStorage.getItem('auth_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('accessToken') ||
                  sessionStorage.getItem('auth_token') ||
                  sessionStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const [usuariosRes, medsRes, invRes, citasRes] = await Promise.allSettled([
      fetch('http://localhost:3000/usuarios', { headers: authHeaders }),
      fetch('http://localhost:3000/Registro_medicamentos', { headers: authHeaders }),
      fetch('http://localhost:3000/inventario', { headers: authHeaders }),
      fetch('http://localhost:3000/obtenerCitas', { headers: authHeaders })
    ]);

    // log response statuses
    console.log('fetch statuses', {
      usuarios: usuariosRes.status === 'fulfilled' ? usuariosRes.value.status : usuariosRes.status,
      medicamentos: medsRes.status === 'fulfilled' ? medsRes.value.status : medsRes.status,
      inventario: invRes.status === 'fulfilled' ? invRes.value.status : invRes.status,
      citas: citasRes.status === 'fulfilled' ? citasRes.value.status : citasRes.status
    });

    const usuarios = usuariosRes.status === 'fulfilled' && usuariosRes.value.ok ? await usuariosRes.value.json() : [];
    const medicamentos = medsRes.status === 'fulfilled' && medsRes.value.ok ? await medsRes.value.json() : [];
    const inventario = invRes.status === 'fulfilled' && invRes.value.ok ? await invRes.value.json() : [];
    const citas = citasRes.status === 'fulfilled' && citasRes.value.ok ? await citasRes.value.json() : [];

    // if any returned ok:false, show toast with server message
    [usuariosRes, medsRes, invRes, citasRes].forEach(res => {
      if (res.status === 'fulfilled' && res.value && res.value.ok === false) {
        const msg = res.value.mensaje || res.value.message || 'Error de servidor';
        mostrarToast(msg, 'warning');
      }
    });

    console.log('Parsed lengths', {
      usuarios: usuarios.length,
      medicamentos: medicamentos.length,
      inventario: inventario.length,
      citas: citas.length
    });

    // Remove skeleton
    document.querySelectorAll('.dashboard-kpi-card').forEach(card => {
      card.classList.remove('skeleton-shimmer');
    });

    // Animate KPIs
    const kpiUsuarios = document.getElementById('kpiUsuariosTotal');
    const kpiMeds = document.getElementById('kpiMedicamentosActivos');
    const kpiStock = document.getElementById('kpiStockBajo');
    const kpiCitas = document.getElementById('kpiCitasHoy');
    
    if (kpiUsuarios) animateCounter(kpiUsuarios, usuarios.length);
    if (kpiMeds) animateCounter(kpiMeds, medicamentos.filter(m => m.estado === 'activo').length);
    if (kpiStock) animateCounter(kpiStock, inventario.filter(i => Number(i.cantidad || 0) <= 10).length);
    if (kpiCitas) animateCounter(kpiCitas, citas.filter(c => (c.fecha_hora || '').split('T')[0] === new Date().toISOString().split('T')[0]).length);
    
    console.log('KPI values', {
      usuarios: usuarios.length,
      medicamentos: medicamentos.filter(m => m.estado === 'activo').length,
      stockBajo: inventario.filter(i => Number(i.cantidad||0) <= 10).length,
      citasHoy: citas.filter(c => (c.fecha_hora || '').split('T')[0] === new Date().toISOString().split('T')[0]).length
    });

    // Update last update time
    if (lastUpdateEl) {
      lastUpdateEl.textContent = 'justo ahora';
      setTimeout(() => lastUpdateEl.textContent = '10s', 10000);
    }
    
    // Update chart default text color to match theme
    if (hasChart) {
      Chart.defaults.color = getComputedStyle(document.body).color || '#1e293b';
      // Charts - Trends
      createTrendChart(usuarios.length, medicamentos.length);
      
      // Inventory Pie Chart
      createInventoryPieChart(inventario);
      
      // Sparklines
      createSparkline('sparkline-users', [10, 15, 20, 25, 30, usuarios.length]);
      createSparkline('sparkline-meds', [5, 8, 12, 15, 18, medicamentos.filter(m => m.estado === 'activo').length]);
      createSparkline('sparkline-stock', [3, 2, 4, 1, 2, inventario.filter(i => Number(i.cantidad || 0) <= 10).length]);
      createSparkline('sparkline-citas', [1, 3, 2, 4, 5, citas.filter(c => (c.fecha_hora || '').split('T')[0] === new Date().toISOString().split('T')[0]).length]);
    }
    
    // Existing render functions...
    renderActividadReciente(usuarios, medicamentos);
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    mostrarToast('Error al cargar dashboard. Revisa la conexión.', 'error');
  }
}

// Chart Functions
function createTrendChart(usersCount, medsCount) {
  const ctx = document.getElementById('chart-trends')?.getContext('2d');
  if (!ctx || !hasChart) return;

  if (window.myTrendChart) {
    window.myTrendChart.destroy();
    window.myTrendChart = null;
  }
  
  const config = {
    type: 'line',
    data: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
      datasets: [{
        label: 'Usuarios',
        data: [65, 59, 80, usersCount * 0.8, usersCount],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  };
  const chart = new Chart(ctx, config);
  window.myTrendChart = chart;
}

function createInventoryPieChart(inventario) {
  const ctx = document.getElementById('chart-inventory')?.getContext('2d');
  if (!ctx || inventario.length === 0 || !hasChart) return;

  if (window.myInventoryChart) {
    window.myInventoryChart.destroy();
    window.myInventoryChart = null;
  }

  const critical = inventario.filter(i => Number(i.cantidad || 0) <= 10);
  const normal = inventario.length - critical.length;

  const config = {
    type: 'doughnut',
    data: {
      labels: ['Stock Crítico', 'Normal'],
      datasets: [{
        data: [critical.length, normal],
        backgroundColor: ['#ef4444', '#10b981']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: ${ctx.raw} medicamentos`
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config);
  window.myInventoryChart = chart;
}

function renderActividadReciente(users, meds) {
  const actividades = [];
  users.slice(-3).reverse().forEach(u => {
    actividades.push({
      icon: 'bi-person-plus-fill',
      type: 'primary',
      title: `${u.nombres} ${u.apellidos}`,
      subtitle: `Nuevo ${u.rol}`,
      time: new Date().toLocaleTimeString()
    });
  });
  
  const container = document.getElementById('dashboardActividadReciente');
  if (container) {
    container.innerHTML = actividades.map(a => `
      <div class="activity-item glass-card p-3">
        <div class="d-flex align-items-center gap-3">
          <div class="activity-icon ${a.type}">
            <i class="${a.icon}"></i>
          </div>
          <div class="flex-grow-1">
            <h6 class="mb-1">${a.title}</h6>
            <small class="text-muted">${a.subtitle}</small>
          </div>
          <small class="text-muted">${a.time}</small>
        </div>
      </div>
    `).join('') || '<p class="text-muted text-center py-4">Sin actividad reciente</p>';
  }
}





// Sparkline for KPIs (mini charts)
function createSparkline(containerId, data) {
  const host = document.getElementById(containerId);
  if (!host || !hasChart) return;

  let canvas = host;
  if (host.tagName !== 'CANVAS') {
    canvas = host.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = host.clientWidth || 120;
      canvas.height = host.clientHeight || 36;
      host.innerHTML = '';
      host.appendChild(canvas);
    }
  }

  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) return;

  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data: data,
        borderColor: '#667eea',
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      elements: { point: { radius: 0 } }
    }
  });
}

// ===============================
// DASHBOARD MODERNIZADO - ENHANCEMENTS
// ===============================

// Chart instances
let kpiCharts = {};
let inventoryChart = null;

// AOS Animation Init
if (hasAOS) {
  AOS.init({
    duration: 800,
    once: true,
    offset: 100
  });
}

// Dark Mode Toggle
function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const html = document.documentElement;
  
  if (!toggle) return;
  
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    html.setAttribute('data-theme', 'dark');
    toggle.innerHTML = '<i class="bi bi-sun"></i>';
  }
  
  toggle.addEventListener('click', () => {
    const currentDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = currentDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    toggle.innerHTML = newTheme === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon"></i>';
    localStorage.setItem('darkMode', newTheme === 'dark');
  });
}

// Animated Counters
function animateCounters() {
  const counters = document.querySelectorAll('.animate-counter');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counterEl = entry.target.querySelector('.kpi-number');
        const target = parseInt(entry.target.dataset.target) || 0;
        const id = entry.target.dataset.id;
        
        if (counterEl && !counterEl.dataset.animated) {
          let current = 0;
          const increment = target / 100;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              counterEl.textContent = target;
              clearInterval(timer);
            } else {
              counterEl.textContent = Math.floor(current);
            }
          }, 20);
          
          counterEl.dataset.animated = 'true';
        }
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => observer.observe(counter));
}

// Live Update Timer
function startLiveUpdate() {
  const lastUpdate = document.getElementById('last-update');
  let seconds = 0;
  
  const timer = setInterval(() => {
    seconds++;
    if (lastUpdate) {
      lastUpdate.textContent = seconds === 1 ? `${seconds}s` : `${seconds}s`;
    }
  }, 1000);
  
  return timer;
}

// Sparklines (Simple Canvas Charts)
function createSparkline(canvasId, data) {
  const host = document.getElementById(canvasId);
  if (!host) return;

  let canvas = host;
  if (host.tagName !== 'CANVAS') {
    canvas = host.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      host.innerHTML = '';
      host.appendChild(canvas);
    }
  }

  if (typeof canvas.getContext !== 'function') return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 100;
  canvas.height = 30;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const points = data && data.length ? data : [10, 20, 15, 35, 25, 40];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const rango = max - min || 1;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();

  points.forEach((point, i) => {
    const x = points.length === 1 ? canvas.width / 2 : (i / (points.length - 1)) * canvas.width;
    const y = canvas.height - ((point - min) / rango) * canvas.height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// Enhanced Dashboard Loader

// ===============================
// NAVEGACIÓN ENTRE SECCIONES
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const navBtns = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".section");
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const overlay = document.getElementById("overlay");

  function cerrarMenuMovil() {
    if (sidebar) sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("menu-open");
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (sidebar) sidebar.classList.toggle("active");
      if (overlay) overlay.classList.toggle("active");
      document.body.classList.toggle("menu-open");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", cerrarMenuMovil);
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      cerrarMenuMovil();
    }
  });

  function hideAllSections() {
    sections.forEach(s => s.classList.add("d-none"));
    navBtns.forEach(b => b.classList.remove("active"));
  }

  // Mostrar panel por defecto medicamentos
  hideAllSections();
  const medicamentos = document.getElementById("medicamentos");
  if (medicamentos) {
    medicamentos.classList.remove("d-none");
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
      if (window.innerWidth <= 992) cerrarMenuMovil();
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
  const searchMedicamentosTabla = document.getElementById("searchMedicamentosTabla");
  const entriesMedicamentos = document.getElementById("entriesMedicamentos");
  const filtroPaciente = document.getElementById("filtroPaciente");
  const filtroEstado = document.getElementById("filtroEstado");
  const limpiarFiltrosBtn = document.getElementById("limpiarFiltros");
  const paginacionMedicamentos = document.getElementById("paginacionMedicamentos");
  const infoPaginacionMedicamentos = document.getElementById("infoPaginacion");
  const btnAnteriorMedicamentos = document.getElementById("btnAnterior");
  const btnSiguienteMedicamentos = document.getElementById("btnSiguiente");
  const pageNumbersMedicamentos = document.getElementById("pageNumbersMedicamentos");
  
  let medicamentosData = [];
  let pacientesData = [];
  let medicamentosFiltrados = [];
  let paginaActualMedicamentos = 1;
  let MEDICAMENTOS_POR_PAGINA = Number(entriesMedicamentos?.value || 10);
  let editingId = null;

  // Cargar pacientes al iniciar
  async function cargarPacientes() {
    try {
      const respuesta = await fetch(obtenerUrlPacientesSegunVista(), {
        headers: obtenerHeadersPacientes()
      });
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

    // Búsqueda en tabla (estilo DataTable)
    const busquedaTabla = searchMedicamentosTabla?.value.toLowerCase().trim();
    if (busquedaTabla) {
      filtrados = filtrados.filter(m => {
        const paciente = pacientesData.find(p => p.id === m.paciente_id);
        const nombrePaciente = paciente ? `${paciente.nombres} ${paciente.apellidos}` : "";
        return (
          (m.nombre || "").toLowerCase().includes(busquedaTabla) ||
          (m.dosis || "").toLowerCase().includes(busquedaTabla) ||
          String(m.frecuencia_horas || "").includes(busquedaTabla) ||
          nombrePaciente.toLowerCase().includes(busquedaTabla) ||
          (m.estado || "").toLowerCase().includes(busquedaTabla)
        );
      });
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
    
    medicamentosFiltrados = filtrados;
    paginaActualMedicamentos = 1;
    renderMedicamentos();
  }

  // Renderizar medicamentos
  function renderMedicamentos() {
    if (!tablaMedicamentos) return;
    tablaMedicamentos.innerHTML = "";
    
    if (medicamentosFiltrados.length === 0) {
      tablaMedicamentos.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="bi bi-inbox display-4 d-block mb-2"></i>
            No hay medicamentos que coincidan con los filtros.
          </td>
        </tr>
      `;
      if (paginacionMedicamentos) paginacionMedicamentos.classList.add("d-none");
      if (pageNumbersMedicamentos) pageNumbersMedicamentos.innerHTML = "";
      return;
    }

    const totalPaginas = Math.max(1, Math.ceil(medicamentosFiltrados.length / MEDICAMENTOS_POR_PAGINA));
    if (paginaActualMedicamentos > totalPaginas) paginaActualMedicamentos = totalPaginas;
    const inicio = (paginaActualMedicamentos - 1) * MEDICAMENTOS_POR_PAGINA;
    const fin = inicio + MEDICAMENTOS_POR_PAGINA;
    const medicamentosPagina = medicamentosFiltrados.slice(inicio, fin);
    
    medicamentosPagina.forEach((m) => {
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

    if (paginacionMedicamentos) paginacionMedicamentos.classList.remove("d-none");
    if (infoPaginacionMedicamentos) {
      const inicioVisual = medicamentosFiltrados.length ? inicio + 1 : 0;
      const finVisual = Math.min(fin, medicamentosFiltrados.length);
      infoPaginacionMedicamentos.textContent = `Showing ${inicioVisual} to ${finVisual} of ${medicamentosFiltrados.length} entries`;
    }
    if (btnAnteriorMedicamentos) btnAnteriorMedicamentos.disabled = paginaActualMedicamentos <= 1;
    if (btnSiguienteMedicamentos) btnSiguienteMedicamentos.disabled = paginaActualMedicamentos >= totalPaginas;
    renderBotonesPaginaMedicamentos(totalPaginas);
  }

  function renderBotonesPaginaMedicamentos(totalPaginas) {
    if (!pageNumbersMedicamentos) return;
    pageNumbersMedicamentos.innerHTML = "";
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualMedicamentos - Math.floor(maxBotones / 2));
    let fin = inicio + maxBotones - 1;
    if (fin > totalPaginas) {
      fin = totalPaginas;
      inicio = Math.max(1, fin - maxBotones + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `page-number-btn ${i === paginaActualMedicamentos ? "active" : ""}`;
      btn.textContent = i;
      btn.dataset.page = String(i);
      pageNumbersMedicamentos.appendChild(btn);
    }
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

  if (searchMedicamentosTabla) {
    searchMedicamentosTabla.addEventListener("input", () => {
      paginaActualMedicamentos = 1;
      aplicarFiltros();
    });
  }

  if (entriesMedicamentos) {
    entriesMedicamentos.addEventListener("change", () => {
      MEDICAMENTOS_POR_PAGINA = Number(entriesMedicamentos.value || 10);
      paginaActualMedicamentos = 1;
      renderMedicamentos();
    });
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

  if (btnAnteriorMedicamentos) {
    btnAnteriorMedicamentos.addEventListener("click", () => {
      if (paginaActualMedicamentos > 1) {
        paginaActualMedicamentos--;
        renderMedicamentos();
      }
    });
  }

  if (btnSiguienteMedicamentos) {
    btnSiguienteMedicamentos.addEventListener("click", () => {
      const totalPaginas = Math.ceil(medicamentosFiltrados.length / MEDICAMENTOS_POR_PAGINA);
      if (paginaActualMedicamentos < totalPaginas) {
        paginaActualMedicamentos++;
        renderMedicamentos();
      }
    });
  }

  if (pageNumbersMedicamentos) {
    pageNumbersMedicamentos.addEventListener("click", (e) => {
      const btn = e.target.closest(".page-number-btn");
      if (!btn) return;
      const pagina = Number(btn.dataset.page);
      if (!Number.isNaN(pagina)) {
        paginaActualMedicamentos = pagina;
        renderMedicamentos();
      }
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
  const searchInventarioInput = document.getElementById("searchInventario");
  const entriesInventario = document.getElementById("entriesInventario");
  const paginacionInventario = document.getElementById("paginacionInventario");
  const infoPaginacionInventario = document.getElementById("infoPaginacionInventario");
  const btnAnteriorInventario = document.getElementById("btnAnteriorInventario");
  const btnSiguienteInventario = document.getElementById("btnSiguienteInventario");
  const pageNumbersInventario = document.getElementById("pageNumbersInventario");
  const modoActualizarCheckbox = document.getElementById("modoActualizar");
  const selectMedicamentoRow = document.getElementById("selectMedicamentoRow");
  const inputNombreRow = document.getElementById("inputNombreRow");
  const consumoRow = document.getElementById("consumoRow");
  const selectMedicamento = document.getElementById("selectMedicamento");

  let inventarioActual = [];
  let inventarioFiltrado = [];
  let paginaActualInventario = 1;
  let INVENTARIO_POR_PAGINA = Number(entriesInventario?.value || 10);

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
      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }
      const data = await respuesta.json();
      inventarioActual = Array.isArray(data) ? data : [];
      aplicarFiltrosInventario();
    } catch (err) {
      console.error("Error al cargar inventario:", err);
      inventarioActual = [];
      inventarioFiltrado = [];
      renderInventario();
    }
  }

  function aplicarFiltrosInventario() {
    const texto = (searchInventarioInput?.value || "").trim().toLowerCase();
    if (!texto) {
      inventarioFiltrado = [...inventarioActual];
    } else {
      inventarioFiltrado = inventarioActual.filter((m) => {
        return [
          m.nombre,
          m.cantidad,
          m.consumo_por_dosis,
          m.fecha_registro
        ].some((c) => String(c || "").toLowerCase().includes(texto));
      });
    }
    paginaActualInventario = 1;
    renderInventario();
  }

  function renderInventario() {
    if (!tablaInv) return;
    tablaInv.innerHTML = "";

    if (inventarioFiltrado.length === 0) {
      tablaInv.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-inbox display-6 d-block mb-2"></i>
            No matching records found.
          </td>
        </tr>
      `;
      if (paginacionInventario) paginacionInventario.classList.add("d-none");
      if (pageNumbersInventario) pageNumbersInventario.innerHTML = "";
      return;
    }

    const totalPaginas = Math.max(1, Math.ceil(inventarioFiltrado.length / INVENTARIO_POR_PAGINA));
    if (paginaActualInventario > totalPaginas) paginaActualInventario = totalPaginas;
    const inicio = (paginaActualInventario - 1) * INVENTARIO_POR_PAGINA;
    const fin = inicio + INVENTARIO_POR_PAGINA;
    const inventarioPagina = inventarioFiltrado.slice(inicio, fin);

    inventarioPagina.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(m.nombre)}</td>
        <td>${m.cantidad}</td>
        <td>${m.consumo_por_dosis}</td>
        <td>${new Date(m.fecha_registro).toLocaleString()}</td>
      `;
      tablaInv.appendChild(tr);
    });

    if (paginacionInventario) paginacionInventario.classList.remove("d-none");
    if (infoPaginacionInventario) {
      const inicioVisual = inventarioFiltrado.length ? inicio + 1 : 0;
      const finVisual = Math.min(fin, inventarioFiltrado.length);
      infoPaginacionInventario.textContent = `Showing ${inicioVisual} to ${finVisual} of ${inventarioFiltrado.length} entries`;
    }
    if (btnAnteriorInventario) btnAnteriorInventario.disabled = paginaActualInventario <= 1;
    if (btnSiguienteInventario) btnSiguienteInventario.disabled = paginaActualInventario >= totalPaginas;
    renderBotonesPaginaInventario(totalPaginas);
  }

  function renderBotonesPaginaInventario(totalPaginas) {
    if (!pageNumbersInventario) return;
    pageNumbersInventario.innerHTML = "";
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualInventario - Math.floor(maxBotones / 2));
    let fin = inicio + maxBotones - 1;
    if (fin > totalPaginas) {
      fin = totalPaginas;
      inicio = Math.max(1, fin - maxBotones + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `page-number-btn ${i === paginaActualInventario ? "active" : ""}`;
      btn.textContent = i;
      btn.dataset.page = String(i);
      pageNumbersInventario.appendChild(btn);
    }
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

  if (searchInventarioInput) {
    searchInventarioInput.addEventListener("input", () => {
      aplicarFiltrosInventario();
    });
  }

  if (entriesInventario) {
    entriesInventario.addEventListener("change", () => {
      INVENTARIO_POR_PAGINA = Number(entriesInventario.value || 10);
      paginaActualInventario = 1;
      renderInventario();
    });
  }

  if (btnAnteriorInventario) {
    btnAnteriorInventario.addEventListener("click", () => {
      if (paginaActualInventario > 1) {
        paginaActualInventario--;
        renderInventario();
      }
    });
  }

  if (btnSiguienteInventario) {
    btnSiguienteInventario.addEventListener("click", () => {
      const totalPaginas = Math.ceil(inventarioFiltrado.length / INVENTARIO_POR_PAGINA);
      if (paginaActualInventario < totalPaginas) {
        paginaActualInventario++;
        renderInventario();
      }
    });
  }

  if (pageNumbersInventario) {
    pageNumbersInventario.addEventListener("click", (e) => {
      const btn = e.target.closest(".page-number-btn");
      if (!btn) return;
      const pagina = Number(btn.dataset.page);
      if (!Number.isNaN(pagina)) {
        paginaActualInventario = pagina;
        renderInventario();
      }
    });
  }

  window.cargarInventario = cargarInventario;
  window.verificarAlertasStock = verificarAlertasStock;

  cargarInventario();
  verificarAlertasStock();
})();

// ===============================
// ENHANCER UI: LISTA DE CITAS / VERIFICACION / REPORTE SEMANAL
// ===============================
(function () {
  function createDataControls(config) {
    const root = document.getElementById(config.rootId);
    if (!root) return;

    let paginaActual = 1;
    let itemsPorPagina = 10;
    let terminoBusqueda = "";

    const toolbar = document.createElement("div");
    toolbar.className = "datatable-toolbar mb-3";
    toolbar.innerHTML = `
      <div class="datatable-length">
        <select class="form-select form-select-sm">
          <option value="5">5</option>
          <option value="10" selected>10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
        <span>entries per page</span>
      </div>
      <div class="datatable-search">
        <label>Search:</label>
        <input type="text" class="form-control form-control-sm">
      </div>
    `;

    const paginacion = document.createElement("div");
    paginacion.className = "custom-pagination mt-3 d-none";
    paginacion.innerHTML = `
      <small class="pagination-info">Showing 0 to 0 of 0 entries</small>
      <div class="pagination-controls">
        <button type="button" class="btn btn-outline-secondary pagination-nav-btn" data-nav="prev" disabled><i class="bi bi-chevron-left"></i></button>
        <div class="pagination-numbers"></div>
        <button type="button" class="btn btn-outline-secondary pagination-nav-btn" data-nav="next" disabled><i class="bi bi-chevron-right"></i></button>
      </div>
    `;

    root.parentElement?.insertBefore(toolbar, root);
    root.parentElement?.insertBefore(paginacion, root.nextSibling);

    const selectEntries = toolbar.querySelector("select");
    const inputSearch = toolbar.querySelector("input");
    const info = paginacion.querySelector(".pagination-info");
    const numeros = paginacion.querySelector(".pagination-numbers");
    const btnPrev = paginacion.querySelector('[data-nav="prev"]');
    const btnNext = paginacion.querySelector('[data-nav="next"]');

    function obtenerItems() {
      return Array.from(root.querySelectorAll(config.itemSelector));
    }

    function esFilaPlaceholder(item) {
      if (!item) return false;
      const td = item.querySelector("td[colspan]");
      if (!td) return false;
      const txt = (td.textContent || "").toLowerCase();
      return txt.includes("no hay") || txt.includes("cargando") || txt.includes("error");
    }

    function render() {
      const items = obtenerItems();

      if (items.length === 0 || (items.length === 1 && esFilaPlaceholder(items[0]))) {
        toolbar.classList.add("d-none");
        paginacion.classList.add("d-none");
        items.forEach((i) => (i.style.display = ""));
        return;
      }

      toolbar.classList.remove("d-none");

      const filtrados = items.filter((item) =>
        (item.textContent || "").toLowerCase().includes(terminoBusqueda)
      );

      const total = filtrados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / itemsPorPagina));
      if (paginaActual > totalPaginas) paginaActual = totalPaginas;

      const inicio = (paginaActual - 1) * itemsPorPagina;
      const fin = inicio + itemsPorPagina;

      items.forEach((item) => (item.style.display = "none"));
      filtrados.slice(inicio, fin).forEach((item) => (item.style.display = ""));

      paginacion.classList.toggle("d-none", total === 0);
      const inicioVisual = total ? inicio + 1 : 0;
      const finVisual = Math.min(fin, total);
      info.textContent = `Showing ${inicioVisual} to ${finVisual} of ${total} entries`;

      btnPrev.disabled = paginaActual <= 1;
      btnNext.disabled = paginaActual >= totalPaginas;

      numeros.innerHTML = "";
      const maxBtns = 5;
      let inicioBtn = Math.max(1, paginaActual - Math.floor(maxBtns / 2));
      let finBtn = inicioBtn + maxBtns - 1;
      if (finBtn > totalPaginas) {
        finBtn = totalPaginas;
        inicioBtn = Math.max(1, finBtn - maxBtns + 1);
      }

      for (let p = inicioBtn; p <= finBtn; p++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `page-number-btn ${p === paginaActual ? "active" : ""}`;
        btn.textContent = String(p);
        btn.dataset.page = String(p);
        numeros.appendChild(btn);
      }
    }

    selectEntries?.addEventListener("change", () => {
      itemsPorPagina = Number(selectEntries.value || 10);
      paginaActual = 1;
      render();
    });

    inputSearch?.addEventListener("input", () => {
      terminoBusqueda = (inputSearch.value || "").trim().toLowerCase();
      paginaActual = 1;
      render();
    });

    btnPrev?.addEventListener("click", () => {
      if (paginaActual > 1) {
        paginaActual--;
        render();
      }
    });

    btnNext?.addEventListener("click", () => {
      paginaActual++;
      render();
    });

    numeros?.addEventListener("click", (e) => {
      const btn = e.target.closest(".page-number-btn");
      if (!btn) return;
      const p = Number(btn.dataset.page);
      if (!Number.isNaN(p)) {
        paginaActual = p;
        render();
      }
    });

    const observer = new MutationObserver(() => render());
    observer.observe(root, { childList: true, subtree: true });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    createDataControls({
      rootId: "listaCitas",
      itemSelector: ".list-group-item"
    });

    createDataControls({
      rootId: "tablaVerificacionMedicamentos",
      itemSelector: "tbody tr"
    });

    createDataControls({
      rootId: "reporteSemanalContainer",
      itemSelector: "table tbody tr"
    });
  });
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
  const searchUsuariosInput = document.getElementById("searchUsuarios");
  const entriesUsuarios = document.getElementById("entriesUsuarios");
  const paginacionUsuarios = document.getElementById("paginacionUsuarios");
  const infoPaginacionUsuarios = document.getElementById("infoPaginacionUsuarios");
  const btnAnteriorUsuarios = document.getElementById("btnAnteriorUsuarios");
  const btnSiguienteUsuarios = document.getElementById("btnSiguienteUsuarios");
  const pageNumbersUsuarios = document.getElementById("pageNumbersUsuarios");
  const abrirModalUsuarioBtn = document.getElementById("abrirModalUsuario");
  const modalUsuario = document.getElementById("modalUsuario");
  const formUsuario = document.getElementById("formUsuario");
  const guardarUsuarioBtn = document.getElementById("guardarUsuarioBtn");
  const selectCuidadorAsignacion = document.getElementById("selectCuidadorAsignacion");
  const selectPacienteDisponibleAsignacion = document.getElementById("selectPacienteDisponibleAsignacion");
  const agregarPacienteAsignacionBtn = document.getElementById("agregarPacienteAsignacionBtn");
  const tablaPacientesAsignadosBody = document.querySelector("#tablaPacientesAsignados tbody");
  const guardarAsignacionesBtn = document.getElementById("guardarAsignacionesBtn");
  const resumenAsignacionesCuidador = document.getElementById("resumenAsignacionesCuidador");
  
  // Campos del formulario
  const nombresUsuario = document.getElementById("nombresUsuario");
  const apellidosUsuario = document.getElementById("apellidosUsuario");
  const identidadUsuario = document.getElementById("identidadUsuario");
  const telefonoUsuario = document.getElementById("telefonoUsuario");
  const emailUsuario = document.getElementById("emailUsuario");
  const passwordUsuario = document.getElementById("passwordUsuario");
  const rolUsuario = document.getElementById("rolUsuario");
  
  let usuariosData = [];
  let usuariosFiltrados = [];
  let paginaActualUsuarios = 1;
  let USUARIOS_POR_PAGINA = Number(entriesUsuarios?.value || 10);
  let editingUserId = null;
  let cuidadoresAsignacion = [];
  let pacientesAsignacion = [];
  let asignacionesActuales = [];
  let pacientesSeleccionadosAsignacion = [];
  let cuidadorAsignacionActual = "";

  function obtenerTokenAuth() {
    let token = localStorage.getItem('auth_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('accessToken') ||
                sessionStorage.getItem('auth_token') ||
                sessionStorage.getItem('token');

    if (!token) {
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        try {
          const usuario = JSON.parse(usuarioData);
          token = usuario.token || usuario.accessToken || usuario.authToken || token;
        } catch (e) {
          console.warn('No se pudo recuperar token desde localStorage.usuario', e);
        }
      }
    }

    return token;
  }

  function crearHeadersAuth(incluirJson = false) {
    const headers = {};
    const token = obtenerTokenAuth();
    if (incluirJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // Cargar usuarios desde el servidor
  async function cargarUsuarios() {
    try {
      const respuesta = await fetch("http://localhost:3000/usuarios", {
        headers: crearHeadersAuth()
      });
      
      if (!respuesta.ok) {
        if (respuesta.status === 403) {
          mostrarToast("No tienes permisos para ver usuarios", "error");
          return;
        }
        throw new Error("Error al cargar usuarios");
      }
      
      usuariosData = await respuesta.json();
      usuariosFiltrados = [...usuariosData];
      paginaActualUsuarios = 1;
      renderUsuarios();
      await cargarAsignacionesCuidadores();
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      mostrarToast("Error al cargar usuarios: " + error.message, "error");
    }
  }

  function renderListaPacientesAsignacion() {
    if (!tablaPacientesAsignadosBody) return;

    const cuidadorId = selectCuidadorAsignacion?.value;
    if (!cuidadorId) {
      cuidadorAsignacionActual = "";
      pacientesSeleccionadosAsignacion = [];
      if (selectPacienteDisponibleAsignacion) {
        selectPacienteDisponibleAsignacion.innerHTML = '<option value="">Selecciona un paciente</option>';
      }
      tablaPacientesAsignadosBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Selecciona un cuidador para administrar sus pacientes.</td></tr>';
      if (resumenAsignacionesCuidador) {
        resumenAsignacionesCuidador.textContent = 'Selecciona un cuidador para administrar sus pacientes.';
      }
      return;
    }

    if (String(cuidadorAsignacionActual) !== String(cuidadorId)) {
      pacientesSeleccionadosAsignacion = asignacionesActuales
        .filter((item) => String(item.cuidador_id) === String(cuidadorId))
        .map((item) => Number(item.paciente_id));
      cuidadorAsignacionActual = String(cuidadorId);
    }

    const pacientesDisponibles = pacientesAsignacion.filter(
      (paciente) => !pacientesSeleccionadosAsignacion.includes(Number(paciente.id))
    );

    if (selectPacienteDisponibleAsignacion) {
      selectPacienteDisponibleAsignacion.innerHTML = '<option value="">Selecciona un paciente</option>';
      pacientesDisponibles.forEach((paciente) => {
        const option = document.createElement("option");
        option.value = String(paciente.id);
        option.textContent = `${paciente.nombres} ${paciente.apellidos}`;
        selectPacienteDisponibleAsignacion.appendChild(option);
      });
    }

    const pacientesAsignadosDetalle = pacientesAsignacion.filter((paciente) =>
      pacientesSeleccionadosAsignacion.includes(Number(paciente.id))
    );

    if (!pacientesAsignadosDetalle.length) {
      tablaPacientesAsignadosBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">Este cuidador no tiene pacientes asignados.</td></tr>';
    } else {
      tablaPacientesAsignadosBody.innerHTML = pacientesAsignadosDetalle.map((paciente) => `
        <tr>
          <td><strong>${escapeHtml(`${paciente.nombres} ${paciente.apellidos}`)}</strong></td>
          <td>${escapeHtml(paciente.email || '')}</td>
          <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-danger quitar-paciente-asignacion-btn" data-id="${paciente.id}">
              <i class="bi bi-trash me-1"></i>Quitar
            </button>
          </td>
        </tr>
      `).join('');
    }

    if (resumenAsignacionesCuidador) {
      const cuidador = cuidadoresAsignacion.find((item) => String(item.id) === String(cuidadorId));
      const totalSeleccionados = pacientesSeleccionadosAsignacion.length;
      resumenAsignacionesCuidador.textContent = cuidador
        ? `${cuidador.nombres} ${cuidador.apellidos} tiene ${totalSeleccionados} paciente(s) asignado(s).`
        : `${totalSeleccionados} paciente(s) asignado(s).`;
    }
  }

  async function cargarAsignacionesCuidadores() {
    if (!selectCuidadorAsignacion) return;

    try {
      const respuesta = await fetch("http://localhost:3000/asignaciones-cuidador", {
        headers: crearHeadersAuth()
      });

      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar las asignaciones');
      }

      const data = await respuesta.json();
      cuidadoresAsignacion = Array.isArray(data.cuidadores) ? data.cuidadores : [];
      pacientesAsignacion = Array.isArray(data.pacientes) ? data.pacientes : [];
      asignacionesActuales = Array.isArray(data.asignaciones) ? data.asignaciones : [];

      const valorActual = selectCuidadorAsignacion.value;
      selectCuidadorAsignacion.innerHTML = '<option value="">Selecciona un cuidador</option>';
      cuidadoresAsignacion.forEach((cuidador) => {
        const option = document.createElement("option");
        option.value = String(cuidador.id);
        option.textContent = `${cuidador.nombres} ${cuidador.apellidos}`;
        selectCuidadorAsignacion.appendChild(option);
      });

      if (valorActual && cuidadoresAsignacion.some((item) => String(item.id) === String(valorActual))) {
        selectCuidadorAsignacion.value = valorActual;
      }

      if (!valorActual) {
        cuidadorAsignacionActual = "";
        pacientesSeleccionadosAsignacion = [];
      }

      renderListaPacientesAsignacion();
    } catch (error) {
      console.error("Error al cargar asignaciones:", error);
      if (tablaPacientesAsignadosBody) {
        tablaPacientesAsignadosBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">No se pudieron cargar las asignaciones.</td></tr>';
      }
      if (resumenAsignacionesCuidador) {
        resumenAsignacionesCuidador.textContent = 'Error al cargar asignaciones.';
      }
    }
  }

  async function guardarAsignacionesCuidador() {
    const cuidadorId = selectCuidadorAsignacion?.value;
    if (!cuidadorId) {
      mostrarToast("Selecciona un cuidador para guardar sus asignaciones", "warning");
      return;
    }

    try {
      const respuesta = await fetch(`http://localhost:3000/asignaciones-cuidador/${cuidadorId}`, {
        method: "POST",
        headers: crearHeadersAuth(true),
        body: JSON.stringify({ pacientes: pacientesSeleccionadosAsignacion })
      });

      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || 'No se pudieron guardar las asignaciones');
      }

      mostrarToast(resultado.mensaje || "Asignaciones guardadas correctamente", "success");
      await cargarAsignacionesCuidadores();
    } catch (error) {
      console.error("Error al guardar asignaciones:", error);
      mostrarToast("Error al guardar asignaciones: " + error.message, "error");
    }
  }

  function agregarPacienteAsignacion() {
    const pacienteId = Number(selectPacienteDisponibleAsignacion?.value || 0);
    if (!pacienteId) {
      mostrarToast("Selecciona un paciente para asignarlo", "warning");
      return;
    }

    if (!pacientesSeleccionadosAsignacion.includes(pacienteId)) {
      pacientesSeleccionadosAsignacion.push(pacienteId);
      renderListaPacientesAsignacion();
    }
  }

  function quitarPacienteAsignacion(pacienteId) {
    pacientesSeleccionadosAsignacion = pacientesSeleccionadosAsignacion.filter((id) => Number(id) !== Number(pacienteId));
    renderListaPacientesAsignacion();
  }

  // Renderizar usuarios en la tabla
  function renderUsuarios() {
    if (!tablaUsuarios) return;
    
    tablaUsuarios.innerHTML = "";
    
    if (usuariosFiltrados.length === 0) {
      if (noUsuariosDiv) noUsuariosDiv.classList.remove("d-none");
      if (paginacionUsuarios) paginacionUsuarios.classList.add("d-none");
      return;
    }
    
    if (noUsuariosDiv) noUsuariosDiv.classList.add("d-none");

    const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / USUARIOS_POR_PAGINA));
    if (paginaActualUsuarios > totalPaginas) paginaActualUsuarios = totalPaginas;
    const inicio = (paginaActualUsuarios - 1) * USUARIOS_POR_PAGINA;
    const fin = inicio + USUARIOS_POR_PAGINA;
    const usuariosPagina = usuariosFiltrados.slice(inicio, fin);

    usuariosPagina.forEach((u) => {
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

    if (paginacionUsuarios) {
      paginacionUsuarios.classList.remove("d-none");
    }
    if (infoPaginacionUsuarios) {
      const inicioVisual = usuariosFiltrados.length ? inicio + 1 : 0;
      const finVisual = Math.min(fin, usuariosFiltrados.length);
      infoPaginacionUsuarios.textContent = `Showing ${inicioVisual} to ${finVisual} of ${usuariosFiltrados.length} entries`;
    }
    if (btnAnteriorUsuarios) {
      btnAnteriorUsuarios.disabled = paginaActualUsuarios <= 1;
    }
    if (btnSiguienteUsuarios) {
      btnSiguienteUsuarios.disabled = paginaActualUsuarios >= totalPaginas;
    }
    renderBotonesPaginaUsuarios(totalPaginas);
  }

  function renderBotonesPaginaUsuarios(totalPaginas) {
    if (!pageNumbersUsuarios) return;
    pageNumbersUsuarios.innerHTML = "";
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActualUsuarios - Math.floor(maxBotones / 2));
    let fin = inicio + maxBotones - 1;
    if (fin > totalPaginas) {
      fin = totalPaginas;
      inicio = Math.max(1, fin - maxBotones + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `page-number-btn ${i === paginaActualUsuarios ? "active" : ""}`;
      btn.textContent = i;
      btn.dataset.page = String(i);
      pageNumbersUsuarios.appendChild(btn);
    }
  }

  function aplicarFiltroUsuarios() {
    const texto = (searchUsuariosInput?.value || "").trim().toLowerCase();
    if (!texto) {
      usuariosFiltrados = [...usuariosData];
    } else {
      usuariosFiltrados = usuariosData.filter((u) => {
        const campos = [
          u.id,
          u.nombres,
          u.apellidos,
          u.identidad,
          u.telefono,
          u.email,
          u.rol
        ];
        return campos.some((c) => String(c || "").toLowerCase().includes(texto));
      });
    }
    paginaActualUsuarios = 1;
    renderUsuarios();
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

      const resp = await fetch(url, {
        method: method,
        headers: crearHeadersAuth(true),
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
      const resp = await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: "DELETE",
        headers: crearHeadersAuth()
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

  if (selectCuidadorAsignacion) {
    selectCuidadorAsignacion.addEventListener("change", renderListaPacientesAsignacion);
  }

  if (guardarAsignacionesBtn) {
    guardarAsignacionesBtn.addEventListener("click", guardarAsignacionesCuidador);
  }

  if (agregarPacienteAsignacionBtn) {
    agregarPacienteAsignacionBtn.addEventListener("click", agregarPacienteAsignacion);
  }

  if (tablaPacientesAsignadosBody) {
    tablaPacientesAsignadosBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".quitar-paciente-asignacion-btn");
      if (!btn) return;
      quitarPacienteAsignacion(Number(btn.dataset.id));
    });
  }

  if (searchUsuariosInput) {
    searchUsuariosInput.addEventListener("input", aplicarFiltroUsuarios);
  }

  if (entriesUsuarios) {
    entriesUsuarios.addEventListener("change", () => {
      USUARIOS_POR_PAGINA = Number(entriesUsuarios.value || 10);
      paginaActualUsuarios = 1;
      renderUsuarios();
    });
  }
  if (btnAnteriorUsuarios) {
    btnAnteriorUsuarios.addEventListener("click", () => {
      if (paginaActualUsuarios > 1) {
        paginaActualUsuarios--;
        renderUsuarios();
      }
    });
  }
  if (btnSiguienteUsuarios) {
    btnSiguienteUsuarios.addEventListener("click", () => {
      const totalPaginas = Math.ceil(usuariosFiltrados.length / USUARIOS_POR_PAGINA);
      if (paginaActualUsuarios < totalPaginas) {
        paginaActualUsuarios++;
        renderUsuarios();
      }
    });
  }

  if (pageNumbersUsuarios) {
    pageNumbersUsuarios.addEventListener("click", (e) => {
      const btn = e.target.closest(".page-number-btn");
      if (!btn) return;
      const pagina = Number(btn.dataset.page);
      if (!Number.isNaN(pagina)) {
        paginaActualUsuarios = pagina;
        renderUsuarios();
      }
    });
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
