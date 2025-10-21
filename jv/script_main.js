// Mostrar año dinámico
document.getElementById("year").textContent = new Date().getFullYear();

// Botones extra
document.getElementById("btnContacto").addEventListener("click", () => {
  alert("Puedes contactarnos en: soporte@siscom.com");
});

document.getElementById("btnInfo").addEventListener("click", () => {
  alert("SISCOM es un sistema diseñado para mejorar el control de medicación de pacientes adultos y geriátricos.");
});

// (Aquí podrás agregar la lógica de login/registro cuando implementes el backend)
