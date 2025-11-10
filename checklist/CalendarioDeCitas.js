const STORAGE_KEY = 'citas_medicas_v1';
const form = document.getElementById('formCita');
const fechaInput = document.getElementById('fecha');
const horaInput = document.getElementById('hora');
const motivoInput = document.getElementById('motivo');
const anticipacionInput = document.getElementById('anticipacion');
const listaCitasEl = document.getElementById('listaCitas');
const resumenEl = document.getElementById('resumen');
const limpiarBtn = document.getElementById('limpiarBtn');
const borrarTodasBtn = document.getElementById('borrarTodasBtn');

let citas = [];
let timeoutsProgramados = {};

document.addEventListener('DOMContentLoaded', () => {
  cargarCitas();
  renderizarLista();
  solicitarPermisoNotificacionSiNecesario();
  programarTodasNotificaciones();
});

function guardarCitas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
}

function cargarCitas() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        citas = parsed.map(c => ({ ...c }));
        return;
      }
    } catch (e) {
      console.error('Error parseando citas desde localStorage', e);
    }
  }
  citas = [];
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
    const titulo = 'Recordatorio de cita';
    const body = `${formatearFechaHora(citaDate)} — ${cita.motivo}`;
    new Notification(titulo, { body, tag: `cita-${cita.id}`, renotify: true });
  } catch (e) {
    console.error('Error mostrando notificación', e);
  }
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
    verBtn.textContent = 'Ver';
    verBtn.onclick = () =>
      alert(`Cita:\nFecha: ${formatearFechaHora(citaDate)}\nMotivo: ${cita.motivo}\nNotificar: ${cita.anticipacion} minutos antes`);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-outline-danger';
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = () => {
      if (confirm('¿Eliminar esta cita?')) eliminarCita(cita.id);
    };
    acciones.append(verBtn, delBtn);
    li.append(info, acciones);
    listaCitasEl.appendChild(li);
  });

  const proximas = citas.filter(c => new Date(c.datetime) > new Date());
  if (proximas.length === 0) resumenEl.textContent = 'No hay citas futuras.';
  else resumenEl.textContent = `Próxima cita: ${formatearFechaHora(new Date(proximas[0].datetime))} — ${proximas[0].motivo}`;
}

function generarId() {
  return 'cita_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function agregarCitaDesdeFormulario(e) {
  e.preventDefault();
  const fecha = fechaInput.value;
  const hora = horaInput.value;
  const motivo = motivoInput.value.trim();
  const anticipacion = anticipacionInput.value;
  if (!fecha || !hora || !motivo) return alert('Completa fecha, hora y motivo.');
  const dt = combinarFechaHora(fecha, hora);
  if (!dt || isNaN(dt.getTime())) return alert('Fecha u hora inválida.');
  const nueva = { id: generarId(), datetime: dt.toISOString(), motivo, anticipacion: Number(anticipacion) };
  citas.push(nueva);
  guardarCitas();
  renderizarLista();
  solicitarPermisoNotificacionSiNecesario().then(() => scheduleNotificationForCita(nueva));
  form.reset();
  anticipacionInput.value = '60';
}

function eliminarCita(id) {
  if (timeoutsProgramados[id]) clearTimeout(timeoutsProgramados[id]);
  citas = citas.filter(c => c.id !== id);
  guardarCitas();
  renderizarLista();
}

function borrarTodasCitas() {
  if (!confirm('¿Seguro que deseas borrar todas las citas?')) return;
  for (const id in timeoutsProgramados) clearTimeout(timeoutsProgramados[id]);
  citas = [];
  guardarCitas();
  renderizarLista();
}

form.addEventListener('submit', agregarCitaDesdeFormulario);
limpiarBtn.addEventListener('click', () => form.reset());
borrarTodasBtn.addEventListener('click', borrarTodasCitas);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') programarTodasNotificaciones();
});

window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY) {
    cargarCitas();
    renderizarLista();
    programarTodasNotificaciones();
  }
});
