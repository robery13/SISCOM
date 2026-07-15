// ===============================
/* DASHBOARD ENHANCEMENTS */
// ===============================
const hasAOS = typeof window !== "undefined" && typeof window.AOS !== "undefined";
const hasChart = typeof window !== "undefined" && typeof window.Chart !== "undefined";

// ===============================
// PARÁMETROS DEL SISTEMA (Fase A - parametrización general)
// Antes los umbrales de "stock crítico"/"stock bajo" eran números fijos
// ("if cantidad <= 5") repartidos por el código. Ahora se cargan una sola
// vez desde /parametros-publicos (tabla parametros_sistema) y se guardan
// aquí en memoria; si el usuario administrador cambia el parámetro, aquí
// es el único lugar que hay que resincronizar.
// ===============================
window.PARAMETROS_SISTEMA = {
  stock_critico_umbral: 5,
  stock_bajo_umbral: 10
};

async function cargarParametrosSistemaGlobal() {
  try {
    const respuesta = await fetch("https://siscom-4lbe.onrender.com/parametros-publicos");
    if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
    const parametros = await respuesta.json();
    if (parametros.stock_critico_umbral !== undefined) {
      window.PARAMETROS_SISTEMA.stock_critico_umbral = Number(parametros.stock_critico_umbral);
    }
    if (parametros.stock_bajo_umbral !== undefined) {
      window.PARAMETROS_SISTEMA.stock_bajo_umbral = Number(parametros.stock_bajo_umbral);
    }
  } catch (error) {
    console.error("No se pudieron cargar los parámetros del sistema, se usan valores por defecto:", error);
  }
}
cargarParametrosSistemaGlobal();

// El plugin de etiquetas de datos (chartjs-plugin-datalabels) NO se auto-registra
// desde la v1: hay que registrarlo explícitamente o simplemente no hace nada.
// Lo registramos una vez y lo desactivamos por defecto para no saturar los
// sparklines y el gráfico de accesos; el gráfico de inventario lo reactiva.
if (hasChart && typeof window.ChartDataLabels !== 'undefined') {
  window.Chart.register(window.ChartDataLabels);
}
if (hasChart && window.Chart.defaults) {
  window.Chart.defaults.set('plugins.datalabels', { display: false });
}

function toLocalISODate(dateInput = new Date()) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalSQLDateTime(dateInput = new Date()) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${toLocalISODate(date)} ${hh}:${mm}:${ss}`;
}

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
    ? 'https://siscom-4lbe.onrender.com/mis-pacientes'
    : 'https://siscom-4lbe.onrender.com/usuarios/rol/usuario';
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

// ===============================
/* SELECTOR DE PERÍODO DEL DASHBOARD */
// ===============================
// Período activo (día, semana, mes, año). Se guarda para recordarlo entre visitas.
window.dashboardPeriodo = localStorage.getItem('dashboardPeriodo') || 'mes';

const PERIODO_LABELS = {
  dia: 'Día',
  semana: 'Semana',
  mes: 'Mes',
  anio: 'Año'
};

// Calcula el rango [inicio, fin] del período actual y el rango equivalente
// inmediatamente anterior (misma duración), para poder comparar de forma real.
function calcularRangosPeriodo(periodo, referencia = new Date()) {
  const fin = new Date(referencia);
  fin.setHours(23, 59, 59, 999);
  let inicio = new Date(referencia);

  switch (periodo) {
    case 'dia':
      inicio.setHours(0, 0, 0, 0);
      break;
    case 'semana': {
      const diaSemana = inicio.getDay(); // 0 = domingo
      const offset = (diaSemana === 0 ? 6 : diaSemana - 1); // lunes como inicio de semana
      inicio.setDate(inicio.getDate() - offset);
      inicio.setHours(0, 0, 0, 0);
      break;
    }
    case 'anio':
      inicio = new Date(referencia.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case 'mes':
    default:
      inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1, 0, 0, 0, 0);
      break;
  }

  const duracionMs = fin.getTime() - inicio.getTime();
  const finAnterior = new Date(inicio.getTime() - 1);
  const inicioAnterior = new Date(finAnterior.getTime() - duracionMs);

  return { inicio, fin, inicioAnterior, finAnterior };
}

// Calcula el % de cambio real entre dos cantidades (sin inventar datos).
// Devuelve null cuando no se puede calcular un porcentaje con sentido.
function calcularCambioPorcentual(actual, anterior) {
  if (anterior === 0) {
    return actual === 0 ? null : { valor: 100, direccion: 'positive' };
  }
  const cambio = ((actual - anterior) / anterior) * 100;
  return {
    valor: Math.abs(Math.round(cambio)),
    direccion: cambio >= 0 ? 'positive' : 'negative'
  };
}

// Pinta la etiqueta de tendencia de un KPI solo cuando hay un dato real de
// comparación contra el período anterior. Si no lo hay, no se muestra nada
// (antes se mostraba un badge "Sin variación" que no aportaba información).
function pintarTendencia(elId, cambio) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!cambio) {
    el.className = 'kpi-trend d-none';
    el.innerHTML = '';
    return;
  }
  const icono = cambio.direccion === 'positive' ? 'bi-arrow-up' : 'bi-arrow-down';
  el.className = `kpi-trend ${cambio.direccion}`;
  el.innerHTML = `<i class="bi ${icono}"></i> ${cambio.valor}% vs. período anterior`;
}

// Enlaza el selector de período y las tarjetas KPI (accesos directos) una sola vez.
function inicializarControlesDashboard() {
  const selector = document.getElementById('periodoSelector');
  if (selector && !selector.dataset.bound) {
    selector.dataset.bound = 'true';
    selector.querySelectorAll('.periodo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selector.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.dashboardPeriodo = btn.getAttribute('data-periodo');
        localStorage.setItem('dashboardPeriodo', window.dashboardPeriodo);
        cargarDashboard();
      });
    });
  }

  // Accesos directos: cada tarjeta KPI navega a su sección relacionada
  document.querySelectorAll('.dashboard-kpi-card.kpi-clickable').forEach(card => {
    if (card.dataset.shortcutBound) return;
    card.dataset.shortcutBound = 'true';
    const sectionId = card.getAttribute('data-section');
    const kpiId = card.getAttribute('data-id');
    const irASeccion = () => {
      const navBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
      if (navBtn && navBtn.style.display !== 'none') {
        navBtn.click();
        // No basta con llegar a la sección general: cada KPI debe dejar
        // al usuario viendo exactamente el subconjunto de registros que
        // representa (importante cuando pasen a haber miles de filas).
        setTimeout(() => enfocarDatoDeKPI(kpiId), 150);
      } else {
        mostrarToast('No tienes acceso a esta sección.', 'warning');
      }
    };
    card.addEventListener('click', irASeccion);
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') irASeccion();
    });
  });
}

// Deja la sección destino enfocada en el dato exacto detrás de cada KPI.
function enfocarDatoDeKPI(kpiId) {
  if (kpiId === 'kpiMedicamentosActivos') {
    // "Medicamentos Activos" -> filtrar la tabla para mostrar solo los activos,
    // no todos los medicamentos.
    const filtroEstado = document.getElementById('filtroEstado');
    if (filtroEstado) {
      filtroEstado.value = 'activo';
      filtroEstado.dispatchEvent(new Event('change'));
    }
  } else if (kpiId === 'kpiStockBajo') {
    // "Stock Bajo" -> el reporte con el detalle exacto (qué medicamento, qué
    // cantidad) ya existe como "Alertas de Stock Bajo"; lo llevamos a la vista.
    if (typeof verificarAlertasStock === 'function') verificarAlertasStock();
    document.getElementById('alertasStock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // kpiUsuariosTotal: la sección de Usuarios ya muestra el total completo,
  // así que no necesita un filtro adicional.
  // kpiCitasHoy: el módulo de Citas Médicas de este archivo está desactivado
  // (ver nota en "MÓDULO DE CITAS MÉDICAS - DESACTIVADO"), por lo que hoy no
  // tiene filtros de fecha funcionales para acotar al período del KPI.
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
    const token = obtenerTokenSesion();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    let usuarios = [];
    let estadoUsuarios = 'rol-endpoints';

    const [adminsRes, empleadosRes, pacientesRes] = await Promise.allSettled([
      fetch('https://siscom-4lbe.onrender.com/usuarios/rol/administrador'),
      fetch('https://siscom-4lbe.onrender.com/usuarios/rol/empleado'),
      fetch('https://siscom-4lbe.onrender.com/usuarios/rol/usuario')
    ]);

    const parseRolRes = async (res) => {
      if (res.status === 'fulfilled' && res.value.ok) return res.value.json();
      return [];
    };

    const [admins, empleados, pacientes] = await Promise.all([
      parseRolRes(adminsRes),
      parseRolRes(empleadosRes),
      parseRolRes(pacientesRes)
    ]);

    usuarios = [...admins, ...empleados, ...pacientes];
    estadoUsuarios = `roles:${[
      adminsRes.status === 'fulfilled' ? adminsRes.value.status : adminsRes.status,
      empleadosRes.status === 'fulfilled' ? empleadosRes.value.status : empleadosRes.status,
      pacientesRes.status === 'fulfilled' ? pacientesRes.value.status : pacientesRes.status
    ].join('/')}`;

    const [medsRes, invRes, citasRes, accesosRes] = await Promise.allSettled([
      fetch('https://siscom-4lbe.onrender.com/Registro_medicamentos', { headers: authHeaders }),
      fetch('https://siscom-4lbe.onrender.com/inventario', { headers: authHeaders }),
      fetch('https://siscom-4lbe.onrender.com/obtenerCitas', { headers: authHeaders }),
      fetch('https://siscom-4lbe.onrender.com/accesos-usuarios', { headers: authHeaders })
    ]);

    // log response statuses
    console.log('fetch statuses', {
      usuarios: estadoUsuarios,
      medicamentos: medsRes.status === 'fulfilled' ? medsRes.value.status : medsRes.status,
      inventario: invRes.status === 'fulfilled' ? invRes.value.status : invRes.status,
      citas: citasRes.status === 'fulfilled' ? citasRes.value.status : citasRes.status,
      accesos: accesosRes.status === 'fulfilled' ? accesosRes.value.status : accesosRes.status
    });

    const medicamentos = medsRes.status === 'fulfilled' && medsRes.value.ok ? await medsRes.value.json() : [];
    const inventario = invRes.status === 'fulfilled' && invRes.value.ok ? await invRes.value.json() : [];
    const citas = citasRes.status === 'fulfilled' && citasRes.value.ok ? await citasRes.value.json() : [];
    // accesos_usuarios: historial real de inicios de sesión (fecha_hora). Si el endpoint
    // todavía no existe en el backend desplegado, se degrada a lista vacía sin romper el dashboard.
    const accesos = accesosRes.status === 'fulfilled' && accesosRes.value.ok ? await accesosRes.value.json() : [];

    // if any returned ok:false, show toast with server message (leída del cuerpo real de la respuesta)
    const endpointsDashboard = [
      { nombre: 'Medicamentos', res: medsRes },
      { nombre: 'Inventario', res: invRes },
      { nombre: 'Citas', res: citasRes },
      { nombre: 'Accesos de usuarios', res: accesosRes }
    ];
    for (const { nombre, res } of endpointsDashboard) {
      if (res.status === 'fulfilled' && res.value && res.value.ok === false) {
        let msg = `Error de servidor (${nombre}, HTTP ${res.value.status})`;
        try {
          const cuerpo = await res.value.json();
          if (cuerpo && (cuerpo.mensaje || cuerpo.message)) {
            msg = `${nombre}: ${cuerpo.mensaje || cuerpo.message}`;
          }
        } catch (e) {
          // el cuerpo no era JSON válido, se deja el mensaje por defecto con el status
        }
        console.warn('Fallo endpoint dashboard:', nombre, res.value.status);
        mostrarToast(msg, 'warning');
      } else if (res.status === 'rejected') {
        console.warn('Fallo de red en endpoint dashboard:', nombre, res.reason);
        mostrarToast(`No se pudo contactar: ${nombre}`, 'warning');
      }
    }

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

    // Período seleccionado (día, semana, mes, año) y su rango equivalente anterior
    const periodo = window.dashboardPeriodo || 'mes';
    const { inicio, fin, inicioAnterior, finAnterior } = calcularRangosPeriodo(periodo);

    const fechaCitaEnRango = (c, ini, end) => {
      if (!c.fecha_hora) return false;
      const f = new Date(c.fecha_hora);
      return f >= ini && f <= end;
    };

    const citasPeriodoActual = citas.filter(c => fechaCitaEnRango(c, inicio, fin));
    const citasPeriodoAnterior = citas.filter(c => fechaCitaEnRango(c, inicioAnterior, finAnterior));

    const medicamentosActivos = medicamentos.filter(m => m.estado === 'activo').length;
    const stockBajo = inventario.filter(i => Number(i.cantidad || 0) <= window.PARAMETROS_SISTEMA.stock_bajo_umbral).length;

    // Animate KPIs
    const kpiUsuarios = document.getElementById('kpiUsuariosTotal');
    const kpiMeds = document.getElementById('kpiMedicamentosActivos');
    const kpiStock = document.getElementById('kpiStockBajo');
    const kpiCitas = document.getElementById('kpiCitasHoy');
    const kpiCitasLabel = document.getElementById('kpiCitasLabel');

    if (kpiCitasLabel) kpiCitasLabel.textContent = `Citas (${PERIODO_LABELS[periodo] || 'Período'})`;

    if (kpiUsuarios) animateCounter(kpiUsuarios, usuarios.length);
    if (kpiMeds) animateCounter(kpiMeds, medicamentosActivos);
    if (kpiStock) animateCounter(kpiStock, stockBajo);
    if (kpiCitas) animateCounter(kpiCitas, citasPeriodoActual.length);

    // Etiquetas de tendencia con datos REALES (no inventados):
    // - Citas: se puede comparar contra el período anterior porque tiene fecha real.
    // - Usuarios/Medicamentos/Stock: son totales actuales (foto del momento) y el
    //   backend no guarda su historial, así que no mostramos un % inventado.
    pintarTendencia('kpiCitasTrend', calcularCambioPorcentual(citasPeriodoActual.length, citasPeriodoAnterior.length));
    pintarTendencia('kpiUsersTrend', null);
    pintarTendencia('kpiMedsTrend', null);
    pintarTendencia('kpiStockTrend', null);

    console.log('KPI values', {
      periodo,
      usuarios: usuarios.length,
      medicamentos: medicamentosActivos,
      stockBajo,
      citasPeriodoActual: citasPeriodoActual.length,
      citasPeriodoAnterior: citasPeriodoAnterior.length
    });

    // Update last update time
    if (lastUpdateEl) {
      lastUpdateEl.textContent = 'justo ahora';
      setTimeout(() => lastUpdateEl.textContent = '10s', 10000);
    }
    
    // Update chart default text color to match theme
    if (hasChart) {
      Chart.defaults.color = getComputedStyle(document.body).color || '#1e293b';
      // Gráfico "Acceso de Usuarios": datos reales de inicios de sesión (accesos_usuarios),
      // divididos por sub-período dentro del rango seleccionado.
      createAccesosChart(accesos, periodo);
      const trendsBadge = document.getElementById('chartTrendsBadge');
      if (trendsBadge) trendsBadge.textContent = PERIODO_LABELS[periodo] || 'Período';

      // Inventory Pie Chart
      createInventoryPieChart(inventario);

      // Sparklines: la de citas usa datos reales por sub-período;
      // el resto no tiene historial en el backend, así que se muestra
      // una línea plana en el valor actual (en vez de inventar variación).
      const serieCitas = construirSerieFechasPorSubperiodo(citas, periodo).data;
      createSparkline('sparkline-users', [usuarios.length, usuarios.length]);
      createSparkline('sparkline-meds', [medicamentosActivos, medicamentosActivos]);
      createSparkline('sparkline-stock', [stockBajo, stockBajo]);
      createSparkline('sparkline-citas', serieCitas.length ? serieCitas : [0, citasPeriodoActual.length]);
    }

    // Enlazar selector de período y accesos directos de las tarjetas (idempotente)
    inicializarControlesDashboard();

  } catch (error) {
    console.error('Error loading dashboard:', error);
    mostrarToast('Error al cargar dashboard. Revisa la conexión.', 'error');
  }
}

// Divide una lista de eventos con fecha real (citas o accesos_usuarios) en
// sub-tramos del período seleccionado, para graficar una tendencia real sin
// inventar valores: día -> horas, semana -> días, mes -> semanas, año -> meses.
function construirSerieFechasPorSubperiodo(items, periodo) {
  const ahora = new Date();
  let labels = [];
  let buckets = [];

  const contarEnRango = (ini, fin) => items.filter(it => {
    if (!it.fecha_hora) return false;
    const f = new Date(it.fecha_hora);
    return f >= ini && f <= fin;
  }).length;

  if (periodo === 'dia') {
    for (let h = 0; h < 24; h += 3) {
      const ini = new Date(ahora); ini.setHours(h, 0, 0, 0);
      const fin = new Date(ahora); fin.setHours(h + 2, 59, 59, 999);
      labels.push(`${String(h).padStart(2, '0')}h`);
      buckets.push(contarEnRango(ini, fin));
    }
  } else if (periodo === 'semana') {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const diaSemana = ahora.getDay();
    const offsetLunes = (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunes = new Date(ahora); lunes.setDate(ahora.getDate() - offsetLunes); lunes.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const ini = new Date(lunes); ini.setDate(lunes.getDate() + i);
      const fin = new Date(ini); fin.setHours(23, 59, 59, 999);
      labels.push(dias[i]);
      buckets.push(contarEnRango(ini, fin));
    }
  } else if (periodo === 'anio') {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    for (let m = 0; m < 12; m++) {
      const ini = new Date(ahora.getFullYear(), m, 1, 0, 0, 0, 0);
      const fin = new Date(ahora.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      labels.push(meses[m]);
      buckets.push(contarEnRango(ini, fin));
    }
  } else {
    // mes: dividido en semanas del mes actual
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    let semanaNum = 1;
    let cursor = new Date(primerDiaMes);
    while (cursor <= ultimoDiaMes) {
      const inicioSemana = new Date(cursor);
      const finSemana = new Date(cursor);
      finSemana.setDate(finSemana.getDate() + 6);
      const finReal = finSemana > ultimoDiaMes ? ultimoDiaMes : finSemana;
      const finRealHoras = new Date(finReal); finRealHoras.setHours(23, 59, 59, 999);
      labels.push(`S${semanaNum}`);
      buckets.push(contarEnRango(inicioSemana, finRealHoras));
      cursor.setDate(cursor.getDate() + 7);
      semanaNum++;
    }
  }

  return { labels, data: buckets };
}

// Chart Functions

// "Acceso de Usuarios": gráfico real de inicios de sesión (tabla accesos_usuarios),
// dividido por sub-período dentro del rango seleccionado. Ya no es una tendencia
// de citas ni de usuarios inventada: cada punto es un conteo real de logins.
function createAccesosChart(accesos, periodo) {
  const ctx = document.getElementById('chart-accesos')?.getContext('2d');
  if (!ctx || !hasChart) return;

  if (window.myTrendChart) {
    window.myTrendChart.destroy();
    window.myTrendChart = null;
  }

  const { labels, data } = construirSerieFechasPorSubperiodo(accesos || [], periodo || 'mes');

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Accesos',
        data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} accesos` } },
        datalabels: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  };
  const chart = new Chart(ctx, config);
  window.myTrendChart = chart;

  // Etiqueta siempre visible: total de accesos en el período y en qué
  // sub-período (día/semana/mes) se concentró el pico, con su cantidad exacta.
  const captionAccesos = document.getElementById('totalAccesosCaption');
  if (captionAccesos) {
    const totalAccesos = data.reduce((sum, v) => sum + v, 0);
    if (totalAccesos > 0) {
      const indicePico = data.reduce((iMax, v, i, arr) => v > arr[iMax] ? i : iMax, 0);
      captionAccesos.textContent = `Total: ${totalAccesos} acceso(s) — Pico: ${data[indicePico]} en ${labels[indicePico]}`;
    } else {
      captionAccesos.textContent = 'Sin accesos registrados en este período';
    }
  }
}

function createInventoryPieChart(inventario) {
  const ctx = document.getElementById('chart-inventory')?.getContext('2d');
  if (!ctx || inventario.length === 0 || !hasChart) return;

  if (window.myInventoryChart) {
    window.myInventoryChart.destroy();
    window.myInventoryChart = null;
  }

  // Se pesa por CANTIDAD REAL DE UNIDADES en stock, no por cuántos medicamentos
  // distintos hay. Así, un medicamento con pocas unidades no infla el % solo por
  // ser "1 de N" renglones: su peso refleja cuánto stock representa de verdad.
  // IMPORTANTE: las dos porciones usan el MISMO umbral configurable
  // (stock_bajo_umbral); antes "Normal" usaba un 10 fijo en el código, así que
  // si el administrador subía el parámetro por encima de 10 un mismo
  // medicamento podía contarse como crítico y como normal a la vez.
  const umbral = window.PARAMETROS_SISTEMA.stock_bajo_umbral;
  const criticalItems = inventario.filter(i => Number(i.cantidad || 0) <= umbral);
  const normalItems = inventario.filter(i => Number(i.cantidad || 0) > umbral);
  const criticalUnidades = criticalItems.reduce((sum, i) => sum + Number(i.cantidad || 0), 0);
  const normalUnidades = normalItems.reduce((sum, i) => sum + Number(i.cantidad || 0), 0);
  const totalUnidades = criticalUnidades + normalUnidades;
  const totalMedicamentos = criticalItems.length + normalItems.length;

  // Etiqueta siempre visible con el total de la población (no solo al pasar
  // el mouse): cuántas unidades hay en total y en cuántos medicamentos.
  const captionInventario = document.getElementById('totalInventarioCaption');
  if (captionInventario) {
    captionInventario.textContent = totalUnidades > 0
      ? `Total: ${totalUnidades} unidades en ${totalMedicamentos} medicamento(s) — ${criticalItems.length} en stock bajo/crítico`
      : 'Sin unidades registradas en inventario';
  }

  const config = {
    type: 'doughnut',
    data: {
      labels: ['Stock Crítico', 'Normal'],
      datasets: [{
        data: [criticalUnidades, normalUnidades],
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
            label: ctx => {
              const pct = totalUnidades > 0 ? Math.round((ctx.raw / totalUnidades) * 100) : 0;
              const cantidadMeds = ctx.dataIndex === 0 ? criticalItems.length : normalItems.length;
              return `${ctx.label}: ${ctx.raw} unidades (${pct}%) — ${cantidadMeds} medicamento(s)`;
            }
          }
        },
        // Etiquetas de porcentaje REALES sobre cada porción de la dona
        // (calculadas a partir de las unidades reales en stock, no inventadas).
        datalabels: {
          display: (context) => {
            const valor = context.dataset.data[context.dataIndex];
            return totalUnidades > 0 && valor > 0; // siempre visible si esa porción tiene stock
          },
          color: '#fff',
          font: { weight: '700', size: 13 },
          formatter: (valor) => {
            const pct = totalUnidades > 0 ? Math.round((valor / totalUnidades) * 100) : 0;
            return `${pct}%`;
          }
        }
      }
    }
  };

  const chart = new Chart(ctx, config);
  window.myInventoryChart = chart;
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
    cerrarSesionBtn.addEventListener("click", async () => {
      const token = localStorage.getItem('auth_token') ||
                    localStorage.getItem('token') ||
                    localStorage.getItem('accessToken') ||
                    sessionStorage.getItem('auth_token') ||
                    sessionStorage.getItem('token');

      // Avisar al servidor para invalidar la sesión guardada en BD.
      // Es "mejor esfuerzo": si falla (sin internet, servidor caído, etc.)
      // igual se cierra la sesión localmente para no dejar al usuario atascado.
      if (token) {
        try {
          await fetch('https://siscom-4lbe.onrender.com/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('No se pudo notificar el logout al servidor:', error);
        }
      }

      // Limpiar TODO rastro de sesión, sin importar si vino de "Recordarme"
      // (localStorage) o de una sesión normal (sessionStorage). Si no se
      // borra esto, al volver a index.html el sistema detecta el token
      // guardado y redirige de vuelta al dashboard automáticamente.
      ['auth_token', 'token', 'accessToken', 'remember_me', 'session_start', 'usuario'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

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
      pacientesData = [];
      if (pacienteSelect) {
        pacienteSelect.innerHTML = '<option value="" selected disabled>Seleccione un paciente</option>';
      }
      if (filtroPaciente) {
        filtroPaciente.innerHTML = '<option value="">Todos los pacientes</option>';
      }
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
      let url = "https://siscom-4lbe.onrender.com/Registro_medicamentos";
      let method = "POST";
      
      // Si estamos editando, usar PUT
      if (editingId) {
        url = `https://siscom-4lbe.onrender.com/Registro_medicamentos/${editingId}`;
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
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/Registro_medicamentos");
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
      const resp = await fetch(`https://siscom-4lbe.onrender.com/Registro_medicamentos/${id}`, {
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
  const modalInventarioEl = document.getElementById("modalInventario");
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
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/inventario");
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

  function cerrarModalInventario() {
    if (!modalInventarioEl || typeof bootstrap === "undefined") return;
    const modal = bootstrap.Modal.getInstance(modalInventarioEl) || new bootstrap.Modal(modalInventarioEl);
    modal.hide();
  }

  async function abrirModalActualizarStock(medicamentoId = "") {
    if (!modoActualizarCheckbox) return;

    modoActualizarCheckbox.checked = true;
    modoActualizarCheckbox.dispatchEvent(new Event("change"));
    await cargarMedicamentosParaSeleccion();

    if (selectMedicamento) {
      selectMedicamento.value = medicamentoId ? String(medicamentoId) : "";
    }

    if (modalInventarioEl && typeof bootstrap !== "undefined") {
      const modal = bootstrap.Modal.getInstance(modalInventarioEl) || new bootstrap.Modal(modalInventarioEl);
      modal.show();
    }

    const cantidadInput = document.getElementById("cantidadInv");
    if (cantidadInput) cantidadInput.focus();
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
        const resp = await fetch("https://siscom-4lbe.onrender.com/inventario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos)
        });

        const resultado = await resp.json();
        mostrarToast(resultado.mensaje || (esModoActualizar ? "Stock actualizado correctamente." : "Medicamento agregado al inventario."), "success");
        await cargarInventario();
        await verificarAlertasStock();
        cerrarModalInventario();
        clearInvForm();

      } catch (error) {
        console.error("Error al guardar en inventario:", error);
        mostrarToast("No se pudo conectar con el servidor.", "error");
      }
    });
  }

  async function cargarInventario() {
    try {
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/inventario");
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

  if (modalInventarioEl) {
    modalInventarioEl.addEventListener("hidden.bs.modal", clearInvForm);
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
  window.abrirModalActualizarStock = abrirModalActualizarStock;

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
    const response = await fetch("https://siscom-4lbe.onrender.com/inventario");
    if (!response.ok) throw new Error('Error al cargar inventario');

    const inventario = await response.json();
    const alertas = inventario.filter(item => {
      const cantidad = item.cantidad || 0;
      return cantidad <= window.PARAMETROS_SISTEMA.stock_bajo_umbral;
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
    const nivel = cantidad === 0 ? 'danger' : cantidad <= window.PARAMETROS_SISTEMA.stock_critico_umbral ? 'danger' : 'warning';
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
          <button type="button" class="btn btn-sm btn-outline-primary mt-2 btn-actualizar-stock-alerta" data-id="${item.id}">
            <i class="bi bi-plus-circle me-1"></i> Actualizar stock
          </button>
        </div>
      </div>
    `;
    container.appendChild(itemDiv);
  });

  container.querySelectorAll(".btn-actualizar-stock-alerta").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idMedicamento = btn.dataset.id;
      if (typeof window.abrirModalActualizarStock === "function") {
        await window.abrirModalActualizarStock(idMedicamento);
      }
    });
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
      const resp = await fetch("https://siscom-4lbe.onrender.com/guardarFichaMedica", {
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
      const resp = await fetch("https://siscom-4lbe.onrender.com/obtenerCitas");
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
    const fecha_hora = toLocalSQLDateTime(dt);

    try {
      const res = await fetch('https://siscom-4lbe.onrender.com/guardarCita', {
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
      const res = await fetch(`https://siscom-4lbe.onrender.com/eliminarCita/${id}`, {
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
      const res = await fetch('https://siscom-4lbe.onrender.com/eliminarTodasCitas', {
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

  const tipoNormalizado = ({
    error: 'danger',
    danger: 'danger',
    success: 'success',
    warning: 'warning',
    info: 'info'
  })[String(tipo).toLowerCase()] || 'info';

  const textoClase = (tipoNormalizado === 'warning' || tipoNormalizado === 'info')
    ? 'text-dark'
    : 'text-white';
  const closeClase = (tipoNormalizado === 'warning' || tipoNormalizado === 'info')
    ? 'btn-close'
    : 'btn-close btn-close-white';

  const toastId = 'toast-' + Date.now();
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center ${textoClase} bg-${tipoNormalizado} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(mensaje)}</div>
        <button type="button" class="${closeClase} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
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

  // Caché de dominios permitidos cargada desde el servidor (tabla
  // dominios_correo_permitidos). Se usa un fallback mínimo solo por si el
  // fetch inicial aún no ha terminado o falla, para no romper la validación.
  let dominiosPermitidosCache = new Set(["gmail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"]);

  async function cargarDominiosPermitidosCliente() {
    try {
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/dominios-permitidos-publico");
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const dominios = await respuesta.json();
      if (Array.isArray(dominios) && dominios.length > 0) {
        dominiosPermitidosCache = new Set(dominios.map(d => String(d).toLowerCase()));
      }
    } catch (error) {
      console.error("No se pudo cargar la lista de dominios permitidos, se usa el fallback local:", error);
    }
  }

  function esNombrePersonaValido(valor) {
    const nombreRegex = /^[A-Za-z\u00C0-\u017F]+(?:[ '\-][A-Za-z\u00C0-\u017F]+)*$/;
    return nombreRegex.test((valor || "").trim());
  }

  function esCorreoValido(valor) {
    const emailRegex = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
    const correo = (valor || "").trim().toLowerCase();
    if (!emailRegex.test(correo)) return false;

    const dominio = correo.split("@")[1] || "";
    return dominiosPermitidosCache.has(dominio);
  }
  
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
  let asignacionesOriginalesPorCuidador = new Map();

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
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/usuarios", {
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
      mostrarToast("No fue posible cargar la lista de usuarios. Intenta nuevamente en unos momentos.", "error");
      mostrarEstadoErrorUsuarios("No fue posible cargar la lista de usuarios. Verifica la conexion e intenta nuevamente.");
    }
  }

  function mostrarEstadoErrorUsuarios(mensaje) {
    if (!tablaUsuarios) return;

    if (noUsuariosDiv) noUsuariosDiv.classList.add("d-none");
    if (paginacionUsuarios) paginacionUsuarios.classList.add("d-none");

    tablaUsuarios.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4">
          <div class="text-danger fw-semibold mb-1">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            No se pudieron cargar los usuarios
          </div>
          <div class="text-muted small">${escapeHtml(mensaje || "Ocurrio un problema inesperado.")}</div>
        </td>
      </tr>
    `;
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
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/asignaciones-cuidador", {
        headers: crearHeadersAuth()
      });

      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar las asignaciones');
      }

      const data = await respuesta.json();
      cuidadoresAsignacion = Array.isArray(data.cuidadores) ? data.cuidadores : [];
      pacientesAsignacion = Array.isArray(data.pacientes) ? data.pacientes : [];
      asignacionesActuales = Array.isArray(data.asignaciones) ? data.asignaciones : [];
      asignacionesOriginalesPorCuidador = new Map();
      asignacionesActuales.forEach((item) => {
        const key = String(item.cuidador_id);
        if (!asignacionesOriginalesPorCuidador.has(key)) {
          asignacionesOriginalesPorCuidador.set(key, []);
        }
        asignacionesOriginalesPorCuidador.get(key).push(Number(item.paciente_id));
      });

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

    const original = [...(asignacionesOriginalesPorCuidador.get(String(cuidadorId)) || [])]
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);
    const actual = [...pacientesSeleccionadosAsignacion]
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);

    const sinCambios = original.length === actual.length && original.every((id, idx) => id === actual[idx]);
    if (sinCambios) {
      mostrarToast("No hay cambios en las asignaciones para guardar.", "info");
      return;
    }

    try {
      const respuesta = await fetch(`https://siscom-4lbe.onrender.com/asignaciones-cuidador/${cuidadorId}`, {
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
    cargarRolesEnSelect();

    // Mostrar requisitos de contraseña
    const passwordRequisitos = document.getElementById("passwordRequisitosUsuario");
    if (passwordRequisitos) passwordRequisitos.style.display = "none";
    
    const modal = new bootstrap.Modal(modalUsuario);
    modal.show();
  }

  // Llena el <select> de rol con los roles activos que existen en la BD
  // (tabla "roles"), en vez de tener "usuario/empleado/administrador" fijos.
  async function cargarRolesEnSelect() {
    if (!rolUsuario) return;
    const valorPrevio = rolUsuario.value;
    try {
      const respuesta = await fetch("https://siscom-4lbe.onrender.com/roles-activos", {
        headers: crearHeadersAuth()
      });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const roles = await respuesta.json();
      rolUsuario.innerHTML = '<option value="">Seleccione rol</option>' +
        roles.map(r => `<option value="${escapeHtml(r.nombre_rol)}">${escapeHtml(r.nombre_rol.charAt(0).toUpperCase() + r.nombre_rol.slice(1))}</option>`).join("");
      if (valorPrevio) rolUsuario.value = valorPrevio;
    } catch (error) {
      console.error("Error al cargar roles para el select:", error);
    }
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

    const nombres = nombresUsuario.value.trim();
    const apellidos = apellidosUsuario.value.trim();
    const correo = emailUsuario.value.trim();

    if (!esNombrePersonaValido(nombres)) {
      mostrarToast("El campo nombres solo permite letras y espacios validos.", "warning");
      nombresUsuario.focus();
      return;
    }

    if (!esNombrePersonaValido(apellidos)) {
      mostrarToast("El campo apellidos solo permite letras y espacios validos.", "warning");
      apellidosUsuario.focus();
      return;
    }

    // Validar correo/contraseña con mensajes específicos
    const password = passwordUsuario.value;
    const passwordIngresada = password.trim().length > 0;
    const correoValido = esCorreoValido(correo);
    const passwordValida = passwordIngresada && passwordUsuarioEsValida();

    if (!editingUserId && !correoValido && !passwordValida) {
      mostrarToast("Correo y contraseña incorrectos. Verifica ambos campos.", "warning");
      emailUsuario.focus();
      return;
    }

    if (!editingUserId && !passwordIngresada) {
      mostrarToast("La contraseña es obligatoria para nuevos usuarios.", "warning");
      passwordUsuario.focus();
      return;
    }

    if (!correoValido && passwordIngresada && !passwordValida) {
      mostrarToast("Correo y contraseña incorrectos. Verifica ambos campos.", "warning");
      emailUsuario.focus();
      return;
    }

    if (!correoValido) {
      mostrarToast(`Correo no válido o dominio no permitido. Dominios permitidos: ${Array.from(dominiosPermitidosCache).join(", ")}.`, "warning");
      emailUsuario.focus();
      return;
    }

    if (passwordIngresada && !passwordValida) {
      mostrarToast("La contraseña no cumple con los requisitos mínimos.", "warning");
      passwordUsuario.focus();
      return;
    }

    const datos = {
      nombres,
      apellidos,
      identidad: identidadUsuario.value.trim(),
      telefono: telefonoUsuario.value.trim(),
      email: correo.toLowerCase(),
      password: password || undefined,
      rol: rolUsuario.value
    };

    try {
      let url = "https://siscom-4lbe.onrender.com/registraradm";
      let method = "POST";
      
      if (editingUserId) {
        url = `https://siscom-4lbe.onrender.com/usuarios/${editingUserId}`;
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
    await cargarRolesEnSelect();

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
    // Evitar alerta nativa si intenta eliminar su propio usuario
    const usuarioActualRaw = localStorage.getItem("usuario");
    if (usuarioActualRaw) {
      try {
        const usuarioActual = JSON.parse(usuarioActualRaw);
        if (Number(usuarioActual?.id) === Number(id)) {
          mostrarToast("No puedes eliminar tu propio usuario.", "warning");
          return;
        }
      } catch (e) {
        // Ignorar errores de parseo y continuar flujo normal
      }
    }

    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return;
    
    try {
      const resp = await fetch(`https://siscom-4lbe.onrender.com/usuarios/${id}`, {
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

  // La Asignación de Pacientes ahora vive en su propio menú, fuera de
  // Seguridad, pero sigue necesitando la lista de usuarios (cuidadores/
  // pacientes) para poblar sus selects.
  const asignacionBtn = document.querySelector('.nav-btn[data-section="asignacion-pacientes"]');
  if (asignacionBtn) {
    asignacionBtn.addEventListener("click", () => {
      cargarUsuarios();
    });
  }

  // Exponer función de carga global para que pueda ser llamada desde otros scripts
  window.cargarUsuarios = cargarUsuarios;
  window.obtenerTokenAuth = obtenerTokenAuth;
  window.crearHeadersAuth = crearHeadersAuth;

  // Cargar la lista real de dominios permitidos apenas arranca la página
  cargarDominiosPermitidosCliente();
})();

// ===============================
// MANTENIMIENTO: DOMINIOS DE CORREO PERMITIDOS (Fase A)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const tabla = document.querySelector("#tablaDominios tbody");
  const noDominiosDiv = document.getElementById("noDominios");
  const form = document.getElementById("formNuevoDominio");
  const input = document.getElementById("nuevoDominioInput");
  if (!tabla || !form) return;

  async function cargarDominios() {
    try {
      const respuesta = await fetch(`${API}/dominios-permitidos`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const dominios = await respuesta.json();
      renderDominios(dominios);
    } catch (error) {
      console.error("Error al cargar dominios permitidos:", error);
      mostrarToast("No fue posible cargar los dominios permitidos.", "error");
    }
  }

  function renderDominios(dominios) {
    tabla.innerHTML = "";
    if (!dominios.length) {
      if (noDominiosDiv) noDominiosDiv.classList.remove("d-none");
      return;
    }
    if (noDominiosDiv) noDominiosDiv.classList.add("d-none");

    dominios.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(d.dominio)}</td>
        <td class="text-center">
          <span class="badge ${d.activo ? "bg-success" : "bg-secondary"} toggle-dominio-btn" style="cursor:pointer" data-id="${d.id}" data-activo="${d.activo}">
            ${d.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger eliminar-dominio-btn" data-id="${d.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      tabla.appendChild(tr);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dominio = input.value.trim().toLowerCase();
    if (!dominio) return;
    try {
      const respuesta = await fetch(`${API}/dominios-permitidos`, {
        method: "POST",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify({ dominio })
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible agregar el dominio.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
      form.reset();
      cargarDominios();
    } catch (error) {
      console.error("Error al agregar dominio:", error);
      mostrarToast("Error al agregar el dominio.", "error");
    }
  });

  tabla.addEventListener("click", async (e) => {
    const toggleBtn = e.target.closest(".toggle-dominio-btn");
    const eliminarBtn = e.target.closest(".eliminar-dominio-btn");

    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      const nuevoActivo = toggleBtn.dataset.activo === "1" ? 0 : 1;
      try {
        const respuesta = await fetch(`${API}/dominios-permitidos/${id}`, {
          method: "PUT",
          headers: window.crearHeadersAuth(true),
          body: JSON.stringify({ activo: nuevoActivo })
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) {
          mostrarToast(data.mensaje || "No fue posible actualizar el dominio.", "error");
          return;
        }
        cargarDominios();
      } catch (error) {
        console.error("Error al actualizar dominio:", error);
        mostrarToast("Error al actualizar el dominio.", "error");
      }
    }

    if (eliminarBtn) {
      if (!confirm("¿Eliminar este dominio permitido?")) return;
      const id = eliminarBtn.dataset.id;
      try {
        const respuesta = await fetch(`${API}/dominios-permitidos/${id}`, {
          method: "DELETE",
          headers: window.crearHeadersAuth()
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) {
          mostrarToast(data.mensaje || "No fue posible eliminar el dominio.", "error");
          return;
        }
        mostrarToast(data.mensaje, "success");
        cargarDominios();
      } catch (error) {
        console.error("Error al eliminar dominio:", error);
        mostrarToast("Error al eliminar el dominio.", "error");
      }
    }
  });

  const tabDominios = document.getElementById("tab-dominios-permitidos");
  if (tabDominios) tabDominios.addEventListener("shown.bs.tab", cargarDominios);
})();

// ===============================
// MANTENIMIENTO: ROLES (Fase A)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const tabla = document.querySelector("#tablaRoles tbody");
  const noRolesDiv = document.getElementById("noRoles");
  const form = document.getElementById("formNuevoRol");
  const inputNombre = document.getElementById("nuevoRolNombre");
  const inputDescripcion = document.getElementById("nuevoRolDescripcion");
  if (!tabla || !form) return;

  async function cargarRoles() {
    try {
      const respuesta = await fetch(`${API}/roles`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const roles = await respuesta.json();
      renderRoles(roles);
    } catch (error) {
      console.error("Error al cargar roles:", error);
      mostrarToast("No fue posible cargar los roles.", "error");
    }
  }

  function renderRoles(roles) {
    tabla.innerHTML = "";
    if (!roles.length) {
      if (noRolesDiv) noRolesDiv.classList.remove("d-none");
      return;
    }
    if (noRolesDiv) noRolesDiv.classList.add("d-none");

    roles.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(r.nombre_rol)}</strong></td>
        <td>
          <input type="text" class="form-control form-control-sm descripcion-rol-input" data-id="${r.id}" value="${escapeHtml(r.descripcion || "")}">
        </td>
        <td class="text-center">
          <span class="badge ${r.activo ? "bg-success" : "bg-secondary"} toggle-rol-btn" style="cursor:pointer" data-id="${r.id}" data-activo="${r.activo}" data-descripcion="${escapeHtml(r.descripcion || "")}">
            ${r.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary guardar-rol-btn me-1" data-id="${r.id}" data-activo="${r.activo}"><i class="bi bi-save"></i></button>
          <button class="btn btn-sm btn-outline-danger eliminar-rol-btn" data-id="${r.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      tabla.appendChild(tr);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre_rol = inputNombre.value.trim().toLowerCase();
    const descripcion = inputDescripcion.value.trim();
    if (!nombre_rol) return;
    try {
      const respuesta = await fetch(`${API}/roles`, {
        method: "POST",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify({ nombre_rol, descripcion })
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible crear el rol.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
      form.reset();
      cargarRoles();
    } catch (error) {
      console.error("Error al crear rol:", error);
      mostrarToast("Error al crear el rol.", "error");
    }
  });

  tabla.addEventListener("click", async (e) => {
    const toggleBtn = e.target.closest(".toggle-rol-btn");
    const guardarBtn = e.target.closest(".guardar-rol-btn");
    const eliminarBtn = e.target.closest(".eliminar-rol-btn");

    if (toggleBtn || guardarBtn) {
      const id = (toggleBtn || guardarBtn).dataset.id;
      const fila = (toggleBtn || guardarBtn).closest("tr");
      const descripcionInput = fila.querySelector(".descripcion-rol-input");
      const activoActual = toggleBtn ? toggleBtn.dataset.activo : guardarBtn.dataset.activo;
      const nuevoActivo = toggleBtn ? (activoActual === "1" ? 0 : 1) : Number(activoActual);
      try {
        const respuesta = await fetch(`${API}/roles/${id}`, {
          method: "PUT",
          headers: window.crearHeadersAuth(true),
          body: JSON.stringify({ descripcion: descripcionInput ? descripcionInput.value.trim() : "", activo: nuevoActivo })
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) {
          mostrarToast(data.mensaje || "No fue posible actualizar el rol.", "error");
          return;
        }
        mostrarToast(data.mensaje, "success");
        cargarRoles();
      } catch (error) {
        console.error("Error al actualizar rol:", error);
        mostrarToast("Error al actualizar el rol.", "error");
      }
    }

    if (eliminarBtn) {
      if (!confirm("¿Eliminar este rol?")) return;
      const id = eliminarBtn.dataset.id;
      try {
        const respuesta = await fetch(`${API}/roles/${id}`, {
          method: "DELETE",
          headers: window.crearHeadersAuth()
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) {
          mostrarToast(data.mensaje || "No fue posible eliminar el rol.", "error");
          return;
        }
        mostrarToast(data.mensaje, "success");
        cargarRoles();
      } catch (error) {
        console.error("Error al eliminar rol:", error);
        mostrarToast("Error al eliminar el rol.", "error");
      }
    }
  });

  const tabRoles = document.getElementById("tab-roles");
  if (tabRoles) tabRoles.addEventListener("shown.bs.tab", cargarRoles);
})();

// ===============================
// MANTENIMIENTO: PARÁMETROS DEL SISTEMA (Fase A)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const tabla = document.querySelector("#tablaParametros tbody");
  const noParametrosDiv = document.getElementById("noParametros");
  if (!tabla) return;

  async function cargarParametros() {
    try {
      const respuesta = await fetch(`${API}/parametros`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const parametros = await respuesta.json();
      renderParametros(parametros);
    } catch (error) {
      console.error("Error al cargar parámetros del sistema:", error);
      mostrarToast("No fue posible cargar los parámetros del sistema.", "error");
    }
  }

  function renderParametros(parametros) {
    tabla.innerHTML = "";
    if (!parametros.length) {
      if (noParametrosDiv) noParametrosDiv.classList.remove("d-none");
      return;
    }
    if (noParametrosDiv) noParametrosDiv.classList.add("d-none");

    parametros.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code>${escapeHtml(p.clave)}</code></td>
        <td class="small text-muted">${escapeHtml(p.descripcion || "")}</td>
        <td class="text-center" style="max-width:120px;">
          <input type="${p.tipo === "numero" ? "number" : "text"}" class="form-control form-control-sm text-center valor-parametro-input" data-id="${p.id}" value="${escapeHtml(p.valor)}">
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary guardar-parametro-btn" data-id="${p.id}"><i class="bi bi-save"></i></button>
        </td>`;
      tabla.appendChild(tr);
    });
  }

  tabla.addEventListener("click", async (e) => {
    const guardarBtn = e.target.closest(".guardar-parametro-btn");
    if (!guardarBtn) return;
    const id = guardarBtn.dataset.id;
    const fila = guardarBtn.closest("tr");
    const input = fila.querySelector(".valor-parametro-input");
    const valor = input ? input.value.trim() : "";
    if (!valor) {
      mostrarToast("El valor no puede estar vacío.", "warning");
      return;
    }
    try {
      const respuesta = await fetch(`${API}/parametros/${id}`, {
        method: "PUT",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify({ valor })
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible actualizar el parámetro.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
    } catch (error) {
      console.error("Error al actualizar parámetro:", error);
      mostrarToast("Error al actualizar el parámetro.", "error");
    }
  });

  const tabParametros = document.getElementById("tab-parametros");
  if (tabParametros) tabParametros.addEventListener("shown.bs.tab", cargarParametros);
})();

// ===============================
// MANTENIMIENTO: PERMISOS (Fase B)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const form = document.getElementById("formNuevoPermiso");
  const inputNombre = document.getElementById("nuevoPermisoNombre");
  const inputDescripcion = document.getElementById("nuevoPermisoDescripcion");
  const selectRol = document.getElementById("selectRolPermisos");
  const guardarBtn = document.getElementById("guardarPermisosRolBtn");
  const tabla = document.querySelector("#tablaPermisos tbody");
  if (!form || !selectRol || !tabla) return;

  async function cargarRolesParaSelect() {
    try {
      const respuesta = await fetch(`${API}/roles-activos`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const roles = await respuesta.json();
      selectRol.innerHTML = '<option value="">Selecciona un rol</option>' +
        roles.map(r => `<option value="${escapeHtml(r.nombre_rol)}">${escapeHtml(r.nombre_rol)}</option>`).join("");
    } catch (error) {
      console.error("Error al cargar roles para permisos:", error);
    }
  }

  async function crearPermiso(e) {
    e.preventDefault();
    const nombre_permiso = inputNombre.value.trim().toLowerCase();
    const descripcion = inputDescripcion.value.trim();
    if (!nombre_permiso) return;
    try {
      const respuesta = await fetch(`${API}/permisos`, {
        method: "POST",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify({ nombre_permiso, descripcion })
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible crear el permiso.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
      form.reset();
      if (selectRol.value) cargarPermisosDelRol(selectRol.value);
    } catch (error) {
      console.error("Error al crear permiso:", error);
      mostrarToast("Error al crear el permiso.", "error");
    }
  }

  async function cargarPermisosDelRol(nombreRol) {
    if (!nombreRol) {
      tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Selecciona un rol para ver/editar sus permisos.</td></tr>';
      guardarBtn.disabled = true;
      return;
    }
    try {
      const respuesta = await fetch(`${API}/roles/${encodeURIComponent(nombreRol)}/permisos`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const permisos = await respuesta.json();
      renderPermisos(permisos);
      guardarBtn.disabled = false;
    } catch (error) {
      console.error("Error al cargar permisos del rol:", error);
      mostrarToast("No fue posible cargar los permisos del rol.", "error");
    }
  }

  function renderPermisos(permisos) {
    if (!permisos.length) {
      tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay permisos creados todavía.</td></tr>';
      return;
    }
    tabla.innerHTML = permisos.map(p => `
      <tr>
        <td class="text-center"><input type="checkbox" class="form-check-input permiso-checkbox" data-id="${p.id}" ${p.asignado ? "checked" : ""}></td>
        <td><code>${escapeHtml(p.nombre_permiso)}</code></td>
        <td class="small text-muted">${escapeHtml(p.descripcion || "")}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger eliminar-permiso-btn" data-id="${p.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join("");
  }

  async function guardarPermisosDelRol() {
    const nombreRol = selectRol.value;
    if (!nombreRol) return;
    const idsPermisos = Array.from(tabla.querySelectorAll(".permiso-checkbox:checked")).map(cb => Number(cb.dataset.id));
    try {
      const respuesta = await fetch(`${API}/roles/${encodeURIComponent(nombreRol)}/permisos`, {
        method: "PUT",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify({ idsPermisos })
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible guardar los permisos.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
    } catch (error) {
      console.error("Error al guardar permisos del rol:", error);
      mostrarToast("Error al guardar los permisos del rol.", "error");
    }
  }

  form.addEventListener("submit", crearPermiso);
  selectRol.addEventListener("change", () => cargarPermisosDelRol(selectRol.value));
  guardarBtn.addEventListener("click", guardarPermisosDelRol);

  tabla.addEventListener("click", async (e) => {
    const eliminarBtn = e.target.closest(".eliminar-permiso-btn");
    if (!eliminarBtn) return;
    if (!confirm("¿Eliminar este permiso? Se quitará de todos los roles que lo tengan asignado.")) return;
    const id = eliminarBtn.dataset.id;
    try {
      const respuesta = await fetch(`${API}/permisos/${id}`, {
        method: "DELETE",
        headers: window.crearHeadersAuth()
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible eliminar el permiso.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
      if (selectRol.value) cargarPermisosDelRol(selectRol.value);
    } catch (error) {
      console.error("Error al eliminar permiso:", error);
      mostrarToast("Error al eliminar el permiso.", "error");
    }
  });

  const tabPermisos = document.getElementById("tab-permisos");
  if (tabPermisos) tabPermisos.addEventListener("shown.bs.tab", cargarRolesParaSelect);
})();

// ===============================
// BITÁCORA (Fase B)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const tabla = document.querySelector("#tablaBitacora tbody");
  const noBitacoraDiv = document.getElementById("noBitacora");
  const refrescarBtn = document.getElementById("refrescarBitacoraBtn");
  if (!tabla) return;

  async function cargarBitacora() {
    try {
      const respuesta = await fetch(`${API}/bitacora`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const registros = await respuesta.json();
      renderBitacora(registros);
    } catch (error) {
      console.error("Error al cargar bitácora:", error);
      mostrarToast("No fue posible cargar la bitácora.", "error");
    }
  }

  function renderBitacora(registros) {
    tabla.innerHTML = "";
    if (!registros.length) {
      if (noBitacoraDiv) noBitacoraDiv.classList.remove("d-none");
      return;
    }
    if (noBitacoraDiv) noBitacoraDiv.classList.add("d-none");

    registros.forEach(r => {
      const fecha = r.fecha_hora ? new Date(r.fecha_hora).toLocaleString("es-HN") : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="small">${escapeHtml(fecha)}</td>
        <td class="small">${escapeHtml(r.email || "—")}</td>
        <td class="small">${escapeHtml(r.rol || "—")}</td>
        <td><span class="badge bg-secondary">${escapeHtml(r.accion)}</span></td>
        <td class="small text-muted">${escapeHtml(r.detalle || "")}</td>`;
      tabla.appendChild(tr);
    });
  }

  if (refrescarBtn) refrescarBtn.addEventListener("click", cargarBitacora);

  const tabBitacora = document.getElementById("tab-bitacora");
  if (tabBitacora) tabBitacora.addEventListener("shown.bs.tab", cargarBitacora);
})();

// ===============================
// BACKUP Y RESTORE (Fase B)
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const descargarBtn = document.getElementById("descargarBackupBtn");
  const restaurarBtn = document.getElementById("restaurarBackupBtn");
  const archivoInput = document.getElementById("archivoRestoreInput");
  if (!descargarBtn || !restaurarBtn) return;

  descargarBtn.addEventListener("click", async () => {
    try {
      const respuesta = await fetch(`${API}/backup`, { headers: window.crearHeadersAuth() });
      if (!respuesta.ok) throw new Error("Error HTTP " + respuesta.status);
      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `siscom-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      mostrarToast("Backup descargado correctamente.", "success");
    } catch (error) {
      console.error("Error al descargar backup:", error);
      mostrarToast("No fue posible generar el backup.", "error");
    }
  });

  restaurarBtn.addEventListener("click", async () => {
    const archivo = archivoInput.files[0];
    if (!archivo) {
      mostrarToast("Selecciona primero un archivo de backup (.json).", "warning");
      return;
    }
    if (!confirm("Esto va a reemplazar roles, permisos, dominios permitidos y parámetros actuales con los del archivo. ¿Continuar?")) return;

    try {
      const texto = await archivo.text();
      const backup = JSON.parse(texto);
      const respuesta = await fetch(`${API}/restore`, {
        method: "POST",
        headers: window.crearHeadersAuth(true),
        body: JSON.stringify(backup)
      });
      const data = await respuesta.json();
      if (!respuesta.ok || !data.ok) {
        mostrarToast(data.mensaje || "No fue posible restaurar el backup.", "error");
        return;
      }
      mostrarToast(data.mensaje, "success");
      archivoInput.value = "";
    } catch (error) {
      console.error("Error al restaurar backup:", error);
      mostrarToast("El archivo no es un backup válido de SISCOM.", "error");
    }
  });
})();

// ===============================
// UTILIDAD
// ===============================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || "");
  return div.innerHTML;
}

// ===============================
// ESTADÍSTICAS DE SALUD (HU-27)
// Funciones: Gráficos (cumplimiento doughnut, citas pie, condiciones bar),
//   tarjetas resumen, detalle del paciente, exportar CSV, exportar PDF,
//   comparar entre pacientes (tabla + gráfico barras agrupadas), limpiar comparación
// ===============================
(function(){
  const API = "https://siscom-4lbe.onrender.com";
  const esVistaCuidador = String(window.location.pathname || '').toLowerCase().includes('cuidador_backend.html');
  const chartDisponible = typeof window !== 'undefined' && typeof window.Chart !== 'undefined';

  // Referencias DOM
  const pacienteSelect = document.getElementById("estPacienteSelect");
  const cargarBtn = document.getElementById("estCargarBtn");
  const exportCsvBtn = document.getElementById("estExportarCsvBtn");
  const exportPdfBtn = document.getElementById("estExportarPdfBtn");
  const resumenDiv = document.getElementById("estResumen");
  const compararSelect1 = document.getElementById("estCompararSelect1");
  const compararSelect2 = document.getElementById("estCompararSelect2");
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
  let pacientesCache = [];
  let endpointPacientesDisponible = true;
  let endpointStatsPacienteDisponible = true;
  let endpointStatsCompararDisponible = true;
  let endpointStatsReporteDisponible = true;

  function sincronizarOpcionesComparacion() {
    if (!compararSelect1 || !compararSelect2) return;

    const id1 = String(compararSelect1.value || '');
    const id2 = String(compararSelect2.value || '');

    Array.from(compararSelect1.options).forEach((opt) => {
      const valor = String(opt.value || '');
      opt.disabled = Boolean(valor && valor === id2);
    });

    Array.from(compararSelect2.options).forEach((opt) => {
      const valor = String(opt.value || '');
      opt.disabled = Boolean(valor && valor === id1);
    });
  }

  function manejarCambioComparacion(origen, destino) {
    if (!origen || !destino) return;

    if (origen.value && destino.value && String(origen.value) === String(destino.value)) {
      mostrarNotificacion('Ese paciente ya está seleccionado. Elige uno diferente.', 'warning');
      origen.value = '';
      origen.focus();
    }

    sincronizarOpcionesComparacion();
  }

  function obtenerTokenSesionStats() {
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
        } catch (_) {}
      }
    }
    return token;
  }

  async function obtenerPacientesEstadisticas() {
    const token = obtenerTokenSesionStats();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const intentos = esVistaCuidador
      ? [
      { url: `${API}/mis-pacientes`, map: (p) => ({ id_paciente: p.id, nombre_completo: `${p.nombres || ''} ${p.apellidos || ''}`.trim() }), withAuth: true },
      { url: `${API}/usuarios/rol/usuario`, map: (p) => ({ id_paciente: p.id, nombre_completo: `${p.nombres || ''} ${p.apellidos || ''}`.trim() }) },
      { url: `${API}/pacientes`, map: (p) => ({ id_paciente: p.id_paciente ?? p.id, nombre_completo: p.nombre_completo ?? `${p.nombres || ''} ${p.apellidos || ''}`.trim() }), legacy: true }
    ]
      : [
      { url: `${API}/usuarios/rol/usuario`, map: (p) => ({ id_paciente: p.id, nombre_completo: `${p.nombres || ''} ${p.apellidos || ''}`.trim() }) },
      { url: `${API}/mis-pacientes`, map: (p) => ({ id_paciente: p.id, nombre_completo: `${p.nombres || ''} ${p.apellidos || ''}`.trim() }), withAuth: true },
      { url: `${API}/pacientes`, map: (p) => ({ id_paciente: p.id_paciente ?? p.id, nombre_completo: p.nombre_completo ?? `${p.nombres || ''} ${p.apellidos || ''}`.trim() }), legacy: true }
    ];

    for (const intento of intentos) {
      if (intento.legacy && !endpointPacientesDisponible) continue;
      try {
        const resp = await fetch(intento.url, { headers: intento.withAuth ? headers : {} });
        if (intento.legacy && resp.status === 404) {
          endpointPacientesDisponible = false;
          continue;
        }
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!Array.isArray(data)) continue;
        return data
          .map(intento.map)
          .filter((p) => p.id_paciente && p.nombre_completo);
      } catch (_) {}
    }

    return [];
  }

  function normalizarEstadoCitaStats(estado) {
    const valor = String(estado || '').toLowerCase();
    if (valor === 'completada' || valor === 'cumplida') return 'cumplida';
    if (valor === 'cancelada') return 'cancelada';
    if (valor === 'vencida') return 'vencida';
    return 'programada';
  }

  async function fetchJsonOrThrow(url, options = {}) {
    const resp = await fetch(url, options);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} en ${url}`);
    }
    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      throw new Error(`Respuesta no JSON en ${url}`);
    }
    return resp.json();
  }

  async function construirEstadisticaPacienteFallback(idPaciente) {
    const [meds, citas, tomas] = await Promise.all([
      fetchJsonOrThrow(`${API}/Registro_medicamentos`).catch(() => []),
      fetchJsonOrThrow(`${API}/obtenerCitas`).catch(() => []),
      fetchJsonOrThrow(`${API}/historialMedicacionEventos/${idPaciente}`).catch(() => [])
    ]);

    const paciente =
      pacientesCache.find((p) => String(p.id_paciente) === String(idPaciente)) ||
      { id_paciente: idPaciente, nombre_completo: `Paciente #${idPaciente}`, fecha_nacimiento: null };

    const medicamentos = (Array.isArray(meds) ? meds : [])
      .filter((m) => String(m.paciente_id) === String(idPaciente))
      .map((m) => ({
        nombre: m.nombre || 'Medicamento',
        dosis: m.dosis || '',
        frecuencia: m.frecuencia_horas || m.frecuencia || 0
      }));

    const citasFiltradas = (Array.isArray(citas) ? citas : []).filter((c) => String(c.id_paciente) === String(idPaciente));
    const estadoMap = { programada: 0, cumplida: 0, cancelada: 0, vencida: 0 };
    citasFiltradas.forEach((c) => {
      const e = normalizarEstadoCitaStats(c.estado);
      estadoMap[e] = (estadoMap[e] || 0) + 1;
    });
    const citasDetalle = Object.keys(estadoMap).map((estado) => ({ estado, total: estadoMap[estado] }));

    const tomasArr = Array.isArray(tomas) ? tomas : [];
    const totalProgramados = tomasArr.length;
    const totalTomados = tomasArr.filter((t) => String(t.estado || '').toLowerCase() === 'tomada').length;
    const porcentaje = totalProgramados > 0 ? Math.round((totalTomados / totalProgramados) * 100) : 0;

    return {
      paciente: {
        id_paciente: paciente.id_paciente,
        nombre_completo: paciente.nombre_completo,
        fecha_nacimiento: paciente.fecha_nacimiento || null
      },
      medicamentos,
      alergias: [],
      condiciones: [],
      citas: {
        total: citasFiltradas.length,
        detalle: citasDetalle
      },
      cumplimiento: {
        total_programados: totalProgramados,
        total_tomados: totalTomados,
        porcentaje
      }
    };
  }

  async function construirComparacionFallback(ids) {
    const [meds, citas] = await Promise.all([
      fetchJsonOrThrow(`${API}/Registro_medicamentos`).catch(() => []),
      fetchJsonOrThrow(`${API}/obtenerCitas`).catch(() => [])
    ]);
    const medsArr = Array.isArray(meds) ? meds : [];
    const citasArr = Array.isArray(citas) ? citas : [];

    return ids.map((idPaciente) => {
      const paciente = pacientesCache.find((p) => String(p.id_paciente) === String(idPaciente));
      const citasPaciente = citasArr.filter((c) => String(c.id_paciente) === String(idPaciente));

      return {
        id_paciente: idPaciente,
        nombre_completo: paciente?.nombre_completo || `Paciente #${idPaciente}`,
        total_medicamentos: medsArr.filter((m) => String(m.paciente_id) === String(idPaciente)).length,
        total_condiciones: 0,
        total_alergias: 0,
        total_citas: citasPaciente.length,
        citas_cumplidas: citasPaciente.filter((c) => normalizarEstadoCitaStats(c.estado) === 'cumplida').length,
        citas_canceladas: citasPaciente.filter((c) => normalizarEstadoCitaStats(c.estado) === 'cancelada').length,
        nivel_max: null
      };
    });
  }

  async function construirReporteSemanalFallback(idPaciente, fechaInicio) {
    const base = new Date(`${fechaInicio}T00:00:00`);
    const fechas = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      fechas.push(toLocalISODate(d));
    }

    const respuestas = await Promise.all(
      fechas.map(async (f) => {
        try {
          const datos = await fetchJsonOrThrow(`${API}/tomas/${idPaciente}/${f}`);
          return { fecha: f, tomas: Array.isArray(datos) ? datos : [] };
        } catch (_) {
          return { fecha: f, tomas: [] };
        }
      })
    );

    const dias = respuestas.map((r) => {
      const programados = r.tomas.length;
      const tomados = r.tomas.filter((t) => String(t.estado || '').toLowerCase() === 'tomada').length;
      return {
        fecha: r.fecha,
        programados,
        tomados,
        porcentaje: programados > 0 ? Math.round((tomados / programados) * 100) : null,
        detalle: r.tomas.map((t) => ({
          medicamento: t.nombre_medicamento || 'Medicamento',
          dosis: t.dosis || '',
          horario: t.hora_toma || '',
          tomado: String(t.estado || '').toLowerCase() === 'tomada'
        }))
      };
    });

    const totalProgramados = dias.reduce((acc, d) => acc + d.programados, 0);
    const totalTomados = dias.reduce((acc, d) => acc + d.tomados, 0);
    const porcentaje = totalProgramados > 0 ? Math.round((totalTomados / totalProgramados) * 100) : 0;

    let nivel = 'Baja';
    if (porcentaje >= 90) nivel = 'Excelente';
    else if (porcentaje >= 75) nivel = 'Buena';
    else if (porcentaje >= 50) nivel = 'Regular';

    const fin = new Date(base);
    fin.setDate(base.getDate() + 6);
    const fechaFin = toLocalISODate(fin);
    const paciente = pacientesCache.find((p) => String(p.id_paciente) === String(idPaciente));

    return {
      paciente: {
        id_paciente: idPaciente,
        nombre_completo: paciente?.nombre_completo || `Paciente #${idPaciente}`
      },
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      total_programados: totalProgramados,
      total_tomados: totalTomados,
      porcentaje,
      nivel_adherencia: nivel,
      resumen: totalProgramados
        ? `Se registraron ${totalTomados} tomas de ${totalProgramados} programadas en la semana.`
        : 'No se encontraron tomas registradas en la semana seleccionada.',
      dias
    };
  }

  // ---- Cargar lista de pacientes ----
  async function cargarPacientes() {
    try {
      const pacientes = await obtenerPacientesEstadisticas();
      pacientesCache = pacientes;

      pacienteSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
      compararSelect1.innerHTML = '<option value="">-- Seleccione primer paciente --</option>';
      compararSelect2.innerHTML = '<option value="">-- Seleccione segundo paciente --</option>';

      pacientes.forEach(p => {
        const opt1 = document.createElement("option");
        opt1.value = p.id_paciente;
        opt1.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        pacienteSelect.appendChild(opt1);

        const optC1 = document.createElement("option");
        optC1.value = p.id_paciente;
        optC1.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        compararSelect1.appendChild(optC1);

        const optC2 = document.createElement("option");
        optC2.value = p.id_paciente;
        optC2.textContent = `${p.id_paciente} - ${p.nombre_completo}`;
        compararSelect2.appendChild(optC2);
      });

      // HU-42: También cargar pacientes en el selector del reporte semanal
      cargarPacientesReporte(pacientes);

      if (esVistaCuidador && pacientes.length === 1) {
        const unico = String(pacientes[0].id_paciente);
        pacienteSelect.value = unico;
        compararSelect1.value = unico;
        compararSelect2.value = '';
        if (rptPacienteSelect) rptPacienteSelect.value = unico;
      }
      sincronizarOpcionesComparacion();
    } catch (err) {
      console.error("Error al cargar pacientes:", err);
    }
  }

  // ---- Ver estadísticas de un paciente ----
  cargarBtn.addEventListener("click", async () => {
    const id = pacienteSelect.value;
    if (!id) {
      mostrarNotificacion('Seleccione un paciente.', 'warning');
      return;
    }

    try {
      let data;
      const urlStatsPaciente = `${API}/estadisticas/paciente/${id}`;
      try {
        if (!endpointStatsPacienteDisponible) throw new Error('endpoint deshabilitado por 404 previo');
        data = await fetchJsonOrThrow(urlStatsPaciente);
      } catch (errorApi) {
        if (String(errorApi.message || '').includes('HTTP 404')) {
          endpointStatsPacienteDisponible = false;
        }
        console.warn('Fallback estadísticas paciente activado:', errorApi.message);
        data = await construirEstadisticaPacienteFallback(id);
      }
      datosActuales = data;

      if (!data.paciente) {
        mostrarNotificacion('Paciente no encontrado.', 'warning');
        return;
      }

      if ((!Array.isArray(data.medicamentos) || data.medicamentos.length === 0) &&
          (!data.cumplimiento || Number(data.cumplimiento.total_programados || 0) === 0) &&
          (!data.citas || Number(data.citas.total || 0) === 0)) {
        mostrarNotificacion('Este paciente aún no tiene datos clínicos suficientes para estadísticas.', 'info');
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

      // ---- Gráficos ----
      if (chartDisponible) {
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
      }

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
      mostrarNotificacion('Error al obtener estadísticas del paciente.', 'danger');
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
  if (compararSelect1 && compararSelect2) {
    compararSelect1.addEventListener('change', () => manejarCambioComparacion(compararSelect1, compararSelect2));
    compararSelect2.addEventListener('change', () => manejarCambioComparacion(compararSelect2, compararSelect1));
  }

  compararBtn.addEventListener("click", async () => {
    const id1 = compararSelect1.value;
    const id2 = compararSelect2.value;

    if (!id1 || !id2) {
      mostrarNotificacion('Seleccione un paciente en cada campo.', 'warning');
      return;
    }
    if (id1 === id2) {
      mostrarNotificacion('Seleccione dos pacientes diferentes.', 'warning');
      return;
    }
    const seleccionados = [id1, id2];

    try {
      let data;
      const urlComparar = `${API}/estadisticas/comparar?ids=${seleccionados.join(",")}`;
      try {
        if (!endpointStatsCompararDisponible) throw new Error('endpoint deshabilitado por 404 previo');
        data = await fetchJsonOrThrow(urlComparar);
      } catch (errorApi) {
        if (String(errorApi.message || '').includes('HTTP 404')) {
          endpointStatsCompararDisponible = false;
        }
        console.warn('Fallback comparación activado:', errorApi.message);
        data = await construirComparacionFallback(seleccionados);
      }

      if (!Array.isArray(data) || data.length === 0) {
        mostrarNotificacion('No se encontraron datos para estos pacientes.', 'warning');
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

      if (chartDisponible) {
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
      }

    } catch (err) {
      console.error("Error al comparar:", err);
      mostrarNotificacion('Error al comparar pacientes.', 'danger');
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
    // Resetear selects
    compararSelect1.value = '';
    compararSelect2.value = '';
    sincronizarOpcionesComparacion();
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
    const monday = getMondayFromDate(toLocalISODate(new Date()));
    rptSemanaInput.value = toLocalISODate(monday);
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
        mostrarNotificacion('Seleccione un paciente y una fecha.', 'warning');
        return;
      }

      const monday = getMondayFromDate(fechaSeleccionada);
      const fechaInicio = toLocalISODate(monday);

      try {
        let data;
        const urlReporte = `${API}/reporte-semanal/${idPac}?fecha_inicio=${fechaInicio}`;
        try {
          if (!endpointStatsReporteDisponible) throw new Error('endpoint deshabilitado por 404 previo');
          data = await fetchJsonOrThrow(urlReporte);
        } catch (errorApi) {
          if (String(errorApi.message || '').includes('HTTP 404')) {
            endpointStatsReporteDisponible = false;
          }
          console.warn('Fallback reporte semanal activado:', errorApi.message);
          data = await construirReporteSemanalFallback(idPac, fechaInicio);
        }
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

        // ---- Gráficos reporte semanal ----
        if (chartDisponible) {
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
        }

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
        mostrarNotificacion('Error al generar el reporte semanal.', 'danger');
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

  // ---- Limpiar reporte semanal ----
  const rptLimpiarBtn = document.getElementById("rptLimpiarBtn");
  if (rptLimpiarBtn) {
    rptLimpiarBtn.addEventListener("click", () => {
      rptPacienteSelect.value = "";
      const monday = getMondayFromDate(toLocalISODate(new Date()));
      rptSemanaInput.value = toLocalISODate(monday);
      if (rptResultados) rptResultados.classList.add("d-none");
      if (rptExportarPdfBtn) rptExportarPdfBtn.disabled = true;
      if (chartReporteSemanal) { chartReporteSemanal.destroy(); chartReporteSemanal = null; }
      if (chartReporteDonut) { chartReporteDonut.destroy(); chartReporteDonut = null; }
      datosReporteSemanal = null;
    });
  }

  // ---- Inicialización: cargar pacientes al mostrar la sección de estadísticas ----
  const navBtnEst = document.querySelector('.nav-btn[data-section="estadisticas"]');
  if (navBtnEst) {
    navBtnEst.addEventListener("click", () => cargarPacientes());
  }

  // También cargar al inicio por si ya está visible
  cargarPacientes();
})();
  // --- Función de notificaciones tipo toast (Bootstrap) ---
  function mostrarNotificacion(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container') || (() => {
      const div = document.createElement('div');
      div.id = 'toast-container';
      div.className = 'toast-container position-fixed top-0 end-0 p-3';
      div.style.zIndex = '9999';
      document.body.appendChild(div);
      return div;
    })();

    const colores = {
      success: 'bg-success text-white',
      danger: 'bg-danger text-white',
      error: 'bg-danger text-white',
      warning: 'bg-warning text-dark',
      info: 'bg-info text-dark'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${colores[tipo] || colores.info} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${mensaje}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

// ============================================================
// MÓDULO PEDIDOS FARMACIA (conectado al inventario en tiempo real)
// ============================================================
// El cuidador/administrador arma el pedido ELIGIENDO medicamentos que
// existen en el inventario (no texto libre). Al guardar el pedido, el
// servidor valida que haya stock suficiente y descuenta automáticamente
// la cantidad solicitada del inventario. También se muestra, dentro del
// modal, la disponibilidad completa de inventario con las mismas alertas
// de "Stock Bajo" / "Agotado" que se usan en la sección de Inventario.
document.addEventListener('DOMContentLoaded', () => {
  const openCreateOrderBtn = document.getElementById('open-create-order');
  const createOrderModalEl = document.getElementById('createOrderModal');
  const itemsTableBody = document.querySelector('#itemsTable tbody');
  const addEmptyRowBtn = document.getElementById('addEmptyRow');
  const sendBtn = document.getElementById('sendBtn');
  const formMessage = document.getElementById('formMessage');
  // Pedido interno: el sistema solo maneja una farmacia (la propia), por lo
  // que ya no se solicita ni se muestra farmacia destino ni notas.
  const FARMACIA_INTERNA = 'Farmacia interna';
  const historyList = document.getElementById('historyList');
  const clearAllBtn = document.getElementById('clearAll');
  const detailModalEl = document.getElementById('detailModal');
  const detailBody = document.getElementById('detailBody');

  // Si esta página no tiene el módulo de Pedidos Farmacia, no hacer nada.
  if (!itemsTableBody || !historyList) return;

  let inventarioPedido = [];

  function nivelStock(cantidad) {
    const c = Number(cantidad || 0);
    if (c === 0) return { nivel: 'danger', texto: 'AGOTADO' };
    if (c <= window.PARAMETROS_SISTEMA.stock_critico_umbral) return { nivel: 'danger', texto: 'Stock crítico' };
    if (c <= window.PARAMETROS_SISTEMA.stock_bajo_umbral) return { nivel: 'warning', texto: 'Stock bajo' };
    return { nivel: 'success', texto: 'Disponible' };
  }

  async function cargarInventarioParaPedido() {
    try {
      const respuesta = await fetch('https://siscom-4lbe.onrender.com/inventario');
      if (!respuesta.ok) throw new Error('Error HTTP ' + respuesta.status);
      inventarioPedido = await respuesta.json();
    } catch (error) {
      console.error('Error al cargar inventario para pedido:', error);
      inventarioPedido = [];
    }
    renderInventarioDisponiblePedido();
  }

  function renderInventarioDisponiblePedido() {
    const contenedor = document.getElementById('inventarioDisponiblePedido');
    if (!contenedor) return;

    if (inventarioPedido.length === 0) {
      contenedor.innerHTML = '<div class="text-muted text-center py-2">No hay medicamentos registrados en el inventario.</div>';
      return;
    }

    contenedor.innerHTML = inventarioPedido.map(item => {
      const { nivel, texto } = nivelStock(item.cantidad);
      return `
        <div class="d-flex justify-content-between align-items-center border-bottom py-1">
          <span>${escapeHtml(item.nombre)}</span>
          <span>
            <strong>${item.cantidad}</strong> unid.
            <span class="badge bg-${nivel} ms-2">${texto}</span>
          </span>
        </div>
      `;
    }).join('');
  }

  function opcionesMedicamento() {
    let html = '<option value="">Seleccione medicamento</option>';
    inventarioPedido.forEach(item => {
      const agotado = Number(item.cantidad || 0) === 0;
      html += `<option value="${item.id}" data-nombre="${escapeHtml(item.nombre)}" data-stock="${item.cantidad}" data-consumo="${item.consumo_por_dosis || ''}" ${agotado ? 'disabled' : ''}>
        ${escapeHtml(item.nombre)} (Stock: ${item.cantidad}${agotado ? ' - AGOTADO' : ''})
      </option>`;
    });
    return html;
  }

  function crearFilaPedido() {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <select class="form-select form-select-sm item-medicamento" required>
          ${opcionesMedicamento()}
        </select>
      </td>
      <td><input type="text" class="form-control form-control-sm item-dosis" placeholder="Ej. 500mg"></td>
      <td>
        <input type="number" class="form-control form-control-sm item-cantidad" min="1" value="1" required>
        <small class="text-muted d-block item-stock-info"></small>
      </td>
      <td><button type="button" class="btn btn-sm btn-outline-danger remove-row"><i class="bi bi-trash"></i></button></td>
    `;
    itemsTableBody.appendChild(tr);
  }

  itemsTableBody.addEventListener('change', (e) => {
    const select = e.target.closest('.item-medicamento');
    if (!select) return;
    const tr = select.closest('tr');
    const opcion = select.selectedOptions[0];
    const dosisInput = tr.querySelector('.item-dosis');
    const cantidadInput = tr.querySelector('.item-cantidad');
    const stockInfo = tr.querySelector('.item-stock-info');

    if (!opcion || !opcion.value) {
      if (stockInfo) stockInfo.textContent = '';
      return;
    }

    const stock = Number(opcion.dataset.stock || 0);
    const consumo = opcion.dataset.consumo;

    if (dosisInput && !dosisInput.value) {
      dosisInput.value = consumo ? `${consumo} por toma` : '';
    }
    if (cantidadInput) {
      cantidadInput.max = stock;
      if (Number(cantidadInput.value) > stock) cantidadInput.value = stock || 1;
    }
    if (stockInfo) {
      const { nivel, texto } = nivelStock(stock);
      const claseTexto = nivel === 'success' ? 'text-muted' : `text-${nivel}`;
      stockInfo.innerHTML = `<span class="${claseTexto}">Disponible: ${stock} (${texto})</span>`;
    }
  });

  itemsTableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-row');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (tr) tr.remove();
  });

  itemsTableBody.addEventListener('input', (e) => {
    const cantidadInput = e.target.closest('.item-cantidad');
    if (!cantidadInput) return;
    const max = Number(cantidadInput.max || 0);
    if (max && Number(cantidadInput.value) > max) {
      cantidadInput.value = max;
    }
  });

  function limpiarFormularioPedido() {
    if (itemsTableBody) itemsTableBody.innerHTML = '';
    if (formMessage) formMessage.textContent = '';
    crearFilaPedido();
  }

  if (openCreateOrderBtn) {
    openCreateOrderBtn.addEventListener('click', async () => {
      await cargarInventarioParaPedido();
      limpiarFormularioPedido();
      if (createOrderModalEl && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(createOrderModalEl).show();
      }
    });
  }

  if (addEmptyRowBtn) {
    addEmptyRowBtn.addEventListener('click', () => crearFilaPedido());
  }

  function recolectarItemsPedido() {
    const filas = Array.from(itemsTableBody.querySelectorAll('tr'));
    const items = [];
    for (const fila of filas) {
      const select = fila.querySelector('.item-medicamento');
      const opcion = select?.selectedOptions[0];
      const dosis = fila.querySelector('.item-dosis')?.value.trim() || '';
      const cantidad = Number(fila.querySelector('.item-cantidad')?.value || 0);

      if (!opcion || !opcion.value) continue;

      items.push({
        nombre: opcion.dataset.nombre,
        dosis: dosis || 'No especificada',
        cantidad,
        stockDisponible: Number(opcion.dataset.stock || 0)
      });
    }
    return items;
  }

  function validarItemsPedido(items) {
    if (items.length === 0) return 'Agrega al menos un medicamento al pedido.';
    for (const item of items) {
      if (!item.cantidad || item.cantidad < 1) return `Ingresa una cantidad válida para "${item.nombre}".`;
      if (item.cantidad > item.stockDisponible) return `No hay suficiente stock de "${item.nombre}" (disponible: ${item.stockDisponible}).`;
    }
    return null;
  }

  function mostrarErrorFormulario(mensaje) {
    if (formMessage) {
      formMessage.textContent = mensaje;
      formMessage.className = 'fw-semibold mt-2 text-danger';
    }
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const items = recolectarItemsPedido();
      const error = validarItemsPedido(items);

      if (error) { mostrarErrorFormulario(error); return; }

      const usuarioData = localStorage.getItem('usuario');
      const usuario = usuarioData ? JSON.parse(usuarioData) : null;

      const payload = {
        id: `PED-${Date.now()}`,
        farmacia: FARMACIA_INTERNA,
        items: items.map(({ nombre, dosis, cantidad }) => ({ nombre, dosis, cantidad })),
        notas: null,
        estado: 'Pendiente',
        fecha_creacion: new Date().toISOString().slice(0, 19).replace('T', ' '),
        id_usuario: usuario?.id || null
      };

      sendBtn.disabled = true;
      try {
        const respuesta = await fetch('https://siscom-4lbe.onrender.com/guardarPedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(data.mensaje || 'Error al guardar el pedido');
        }

        mostrarToast('Pedido creado correctamente. Stock actualizado.', 'success');
        if (createOrderModalEl && window.bootstrap) {
          bootstrap.Modal.getInstance(createOrderModalEl)?.hide();
        }
        cargarPedidos();
        if (window.cargarInventario) window.cargarInventario();
        if (window.verificarAlertasStock) window.verificarAlertasStock();
      } catch (err) {
        console.error('Error al guardar pedido:', err);
        mostrarErrorFormulario(err.message);
        mostrarToast(err.message || 'Error al guardar el pedido', 'error');
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  // ================= HISTORIAL DE PEDIDOS =================
  async function cargarPedidos() {
    historyList.innerHTML = '<div class="text-center text-muted py-3">Cargando pedidos...</div>';
    try {
      const respuesta = await fetch('https://siscom-4lbe.onrender.com/obtenerPedidos');
      if (!respuesta.ok) throw new Error('Error al cargar pedidos');
      const pedidos = await respuesta.json();
      renderHistorialPedidos(pedidos);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      historyList.innerHTML = '<div class="text-center text-danger py-3">Error al cargar el historial de pedidos.</div>';
    }
  }

  function renderHistorialPedidos(pedidos) {
    if (!pedidos || pedidos.length === 0) {
      historyList.innerHTML = '<div class="text-center text-muted py-3">No hay pedidos registrados.</div>';
      return;
    }

    historyList.innerHTML = pedidos.map(p => {
      const estadoBadge = p.estado === 'Pendiente' ? 'warning' : p.estado === 'Cancelado' ? 'danger' : 'success';
      const fecha = p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleString() : '';
      const referencia = String(p.id || '').replace(/^PED-/, '');
      return `
        <div class="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2 pedido-item">
          <div class="d-flex align-items-center gap-3">
            <div class="pedido-item-icon"><i class="bi bi-receipt"></i></div>
            <div>
              <strong>Pedido #${escapeHtml(referencia)}</strong>
              <span class="badge bg-${estadoBadge} ms-2">${escapeHtml(p.estado || 'Pendiente')}</span>
              <div class="small text-muted">${fecha} &middot; ${p.total_items || 0} medicamento(s)</div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-primary btn-ver-pedido" data-id="${p.id}">
              <i class="bi bi-eye"></i> Ver
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-pedido" data-id="${p.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  historyList.addEventListener('click', async (e) => {
    const verBtn = e.target.closest('.btn-ver-pedido');
    const delBtn = e.target.closest('.btn-eliminar-pedido');

    if (verBtn) {
      const id = verBtn.dataset.id;
      try {
        const respuesta = await fetch(`https://siscom-4lbe.onrender.com/obtenerPedido/${id}`);
        if (!respuesta.ok) throw new Error('Error al obtener el pedido');
        const data = await respuesta.json();
        if (detailBody) {
          const referencia = String(data.pedido.id || '').replace(/^PED-/, '');
          detailBody.innerHTML = `
            <p><strong>Pedido:</strong> #${escapeHtml(referencia)}</p>
            <p><strong>Estado:</strong> ${escapeHtml(data.pedido.estado || 'Pendiente')}</p>
            <p><strong>Fecha:</strong> ${data.pedido.fecha_creacion ? new Date(data.pedido.fecha_creacion).toLocaleString() : ''}</p>
            <table class="table table-sm table-bordered">
              <thead><tr><th>Medicamento</th><th>Dosis</th><th>Cantidad</th></tr></thead>
              <tbody>
                ${data.items.map(it => `<tr><td>${escapeHtml(it.nombre_medicamento)}</td><td>${escapeHtml(it.dosis)}</td><td>${it.cantidad}</td></tr>`).join('')}
              </tbody>
            </table>
          `;
        }
        if (detailModalEl && window.bootstrap) {
          bootstrap.Modal.getOrCreateInstance(detailModalEl).show();
        }
      } catch (error) {
        console.error('Error al ver pedido:', error);
        mostrarToast('No se pudo cargar el detalle del pedido', 'error');
      }
    }

    if (delBtn) {
      const id = delBtn.dataset.id;
      if (!confirm('¿Eliminar este pedido del historial? Esto NO devuelve el stock descontado.')) return;
      try {
        const respuesta = await fetch(`https://siscom-4lbe.onrender.com/eliminarPedido/${id}`, { method: 'DELETE' });
        if (!respuesta.ok) throw new Error('Error al eliminar el pedido');
        mostrarToast('Pedido eliminado', 'success');
        cargarPedidos();
      } catch (error) {
        console.error('Error al eliminar pedido:', error);
        mostrarToast('No se pudo eliminar el pedido', 'error');
      }
    }
  });

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar TODO el historial de pedidos? Esta acción no se puede deshacer.')) return;
      try {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        const respuesta = await fetch('https://siscom-4lbe.onrender.com/eliminarTodosPedidos', {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.mensaje || 'Error al limpiar el historial');
        mostrarToast('Historial de pedidos eliminado', 'success');
        cargarPedidos();
      } catch (error) {
        console.error('Error al limpiar historial:', error);
        mostrarToast(error.message || 'No se pudo limpiar el historial (requiere rol de administrador)', 'error');
      }
    });
  }

  window.cargarPedidos = cargarPedidos;
});