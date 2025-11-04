const sampleData = [
  { date: '2025-10-01', med: 'Ibuprofeno', dosis: '400 mg', freq: 'Cada 8h', notes: 'Dolor leve' },
  { date: '2025-10-02', med: 'Metformina', dosis: '500 mg', freq: 'Cada 12h', notes: 'Control glucosa' },
  { date: '2025-10-08', med: 'Amoxicilina', dosis: '500 mg', freq: 'Cada 8h', notes: 'Ciclo 7 días' },
  { date: '2025-10-10', med: 'Ibuprofeno', dosis: '400 mg', freq: 'Según necesidad', notes: 'Dolor intermitente' },
  { date: '2025-11-01', med: 'Vitamina D', dosis: '1 tableta', freq: 'Diaria', notes: 'Suplemento' },
  { date: '2025-11-02', med: 'Metformina', dosis: '500 mg', freq: 'Cada 12h', notes: 'Ajuste de dosis' },
  { date: '2025-11-03', med: 'Losartán', dosis: '50 mg', freq: 'Diaria', notes: 'Hipertensión - seguimiento' }
];

// Estado
let currentData = [...sampleData];

// Elementos del DOM 
const tablaMedicamentos = document.getElementById('tablaMedicamentos');
const filtroTiempo = document.getElementById('filtroTiempo');
const busqueda = document.getElementById('busqueda');
const btnExportarPDF = document.getElementById('btnExportarPDF');
const btnExportarExcel = document.getElementById('btnExportarExcel');

// Renderizar la tabla 
function renderTable(data) {
  tablaMedicamentos.innerHTML = '';
  if (!data || data.length === 0) {
    tablaMedicamentos.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay registros</td></tr>`;
    return;
  }

  const rows = data.map(r => {
    return `<tr>
      <td>${r.date}</td>
      <td>${escapeHtml(r.med)}</td>
      <td>${escapeHtml(r.dosis)}</td>
      <td>${escapeHtml(r.freq)}</td>
      <td>${escapeHtml(r.notes)}</td>
    </tr>`;
  }).join('\n');

  tablaMedicamentos.innerHTML = rows;
}


function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Filtrado por periodo: día/semana/mes con referencia a la fecha "hoy" o por defecto la última fecha del dataset
function filterByPeriod(data, period) {
  if (!period) return data;


  const ref = new Date(); // hoy

  const parsed = data.map(d => ({ ...d, _date: new Date(d.date + 'T00:00:00') }));

  let start, end;
  if (period === 'dia') {
    start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0);
    end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59);
  } else if (period === 'semana') {
    // semana: domingo - sábado (puedes ajustar)
    const day = ref.getDay(); // 0..6
    start = new Date(ref);
    start.setDate(ref.getDate() - day);
    start.setHours(0,0,0,0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
  } else if (period === 'mes') {
    start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0);
    end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
  } else {
    return data;
  }

  return parsed.filter(r => r._date >= start && r._date <= end).map(({_date, ...keep}) => keep);
}

// Búsqueda simple (medicamento, dosis, notas)
function searchInData(data, q) {
  if (!q) return data;
  const term = q.trim().toLowerCase();
  return data.filter(r =>
    (r.med && r.med.toLowerCase().includes(term)) ||
    (r.dosis && r.dosis.toLowerCase().includes(term)) ||
    (r.notes && r.notes.toLowerCase().includes(term)) ||
    (r.date && r.date.includes(term))
  );
}

// Exportar CSV (usa FileSaver.js si está incluido)
function exportCSV(filename = 'historial_medicacion.csv') {
  const trs = Array.from(tablaMedicamentos.querySelectorAll('tr'));
  if (trs.length === 0) { alert('No hay datos para exportar'); return; }

  const lines = [];
  lines.push(['Fecha','Medicamento','Dosis','Frecuencia','Observaciones'].join(','));
  trs.forEach(tr => {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length !== 5) return;
    const vals = tds.map(td => {
      // escape " with double quotes
      const text = td.textContent.replace(/"/g, '""');
      return `"${text}"`;
    });
    lines.push(vals.join(','));
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Si FileSaver está incluido:
  if (window.saveAs) {
    saveAs(blob, filename);
  } else {
    // Fallback: crear enlace temporal
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

// Exportar a PDF mediante ventana de impresión (compatible con "guardar como PDF" del navegador)
function exportPDF() {
  const trs = Array.from(tablaMedicamentos.querySelectorAll('tr'));
  if (trs.length === 0) { alert('No hay datos para exportar'); return; }

  // Construimos una tabla HTML simple para imprimir
  const style = `
    <style>
      body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #444; padding: 6px; text-align: left; font-size: 12px; }
      th { background: #0d6efd; color: #fff; }
      caption { font-size: 16px; margin-bottom: 8px; font-weight: bold; }
    </style>
  `;

  const header = `<caption>Historial de Medicación</caption>
    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Observaciones</th>
        </tr>
      </thead>
      <tbody>`;

  const body = trs.map(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent);
    return `<tr>${cells.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
  }).join('');

  const footer = `</tbody></table>`;

  const html = `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${header}${body}${footer}</body></html>`;

  const w = window.open('', '_blank');
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Pequeño delay para asegurar que la ventana renderice antes de invocar print
  setTimeout(() => w.print(), 300);
}

// Inicialización: aplicar filtros y listeners
function init() {
  // Render inicial (todo)
  renderTable(currentData);

  // Al cambiar filtro de tiempo
  filtroTiempo.addEventListener('change', () => {
    applyFiltersAndRender();
  });

  // Búsqueda en vivo
  busqueda.addEventListener('input', () => {
    applyFiltersAndRender();
  });

  // Export buttons
  btnExportarExcel.addEventListener('click', () => exportCSV());
  btnExportarPDF.addEventListener('click', () => exportPDF());
}

// Aplica filtro de periodo y búsqueda, luego renderiza
function applyFiltersAndRender() {
  const period = filtroTiempo.value; // 'dia', 'semana', 'mes'
  const q = busqueda.value || '';
  let data = [...sampleData];
  // Primero filtramos por periodo (si se desea usar hoy como referencia)
  data = filterByPeriod(data, period);
  // Luego aplicamos búsqueda
  data = searchInData(data, q);
  currentData = data;
  renderTable(currentData);
}

// Ejecutar init al cargar el script
document.addEventListener('DOMContentLoaded', init);
