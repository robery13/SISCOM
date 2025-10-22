// --- Navegación lateral ---
const navButtons = document.querySelectorAll('.nav-btn');
const formMedicamentos = document.getElementById('formMedicamentos');

// Cambiar sección visible
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const section = btn.getAttribute('data-section');

    // Mostrar formulario solo si se selecciona "Medicamentos"
    if (section === 'medicamentos') {
      formMedicamentos.classList.remove('d-none');
    } else {
      formMedicamentos.classList.add('d-none');
    }
  });
});

// --- Lógica de recordatorios ---
document.getElementById('guardarBtn').addEventListener('click', function () {
  const nombre = document.getElementById('nombre').value;
  const dosis = document.getElementById('dosis').value;
  const frecuencia = parseInt(document.getElementById('frecuencia').value);
  const hora = document.getElementById('hora').value;

  if (!nombre || !dosis || !frecuencia || !hora) {
    alert("Por favor, complete todos los campos antes de guardar.");
    return;
  }

  const ahora = new Date();
  const [horas, minutos] = hora.split(':').map(Number);
  const horaMedicamento = new Date();
  horaMedicamento.setHours(horas, minutos, 0, 0);

  if (horaMedicamento < ahora) {
    horaMedicamento.setDate(horaMedicamento.getDate() + 1);
  }

  const tiempoRestante = horaMedicamento - ahora;

  alert(`Medicamento "${nombre}" registrado. Se le recordará cada ${frecuencia} horas.`);

  // Programar recordatorios
  setTimeout(() => {
    mostrarNotificacion(nombre, dosis);
    setInterval(() => {
      mostrarNotificacion(nombre, dosis);
    }, frecuencia * 60 * 60 * 1000);
  }, tiempoRestante);
});

function mostrarNotificacion(nombre, dosis) {
  if (Notification.permission === "granted") {
    new Notification("Recordatorio de Medicamento", {
      body: `Es hora de tomar ${nombre} (${dosis})`,
      icon: "https://cdn-icons-png.flaticon.com/512/2966/2966483.png"
    });
  } else {
    alert(`Es hora de tomar ${nombre} (${dosis}).`);
  }
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}
