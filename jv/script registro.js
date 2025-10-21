// ======= LÓGICA DE RECORDATORIOS =======

// Cuando el usuario hace clic en "Guardar Medicamento"
document.getElementById('guardarBtn').addEventListener('click', function () {
  const nombre = document.getElementById('nombre').value;
  const dosis = document.getElementById('dosis').value;
  const frecuencia = parseInt(document.getElementById('frecuencia').value);
  const hora = document.getElementById('hora').value;

  if (!nombre || !dosis || !frecuencia || !hora) {
    alert("Por favor, complete todos los campos antes de guardar.");
    return;
  }

  // Convertimos la hora a un objeto Date del día actual
  const ahora = new Date();
  const [horas, minutos] = hora.split(':').map(Number);
  const horaMedicamento = new Date();
  horaMedicamento.setHours(horas, minutos, 0, 0);

  // Si la hora ya pasó hoy, se programa para el siguiente día
  if (horaMedicamento < ahora) {
    horaMedicamento.setDate(horaMedicamento.getDate() + 1);
  }

  const tiempoRestante = horaMedicamento - ahora;

  alert(`Medicamento "${nombre}" registrado. Se le recordará cada ${frecuencia} horas.`);

  // Programar el primer recordatorio
  setTimeout(() => {
    mostrarNotificacion(nombre, dosis);
    // Luego se repite cada X horas
    setInterval(() => {
      mostrarNotificacion(nombre, dosis);
    }, frecuencia * 60 * 60 * 1000);
  }, tiempoRestante);
});

// Función para mostrar notificación en pantalla
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

// Pedir permiso para notificaciones del navegador
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}
