// Mostrar año dinámico
document.getElementById("year").textContent = new Date().getFullYear();

// Lógica de botones extra
// (Si tienes los botones comentados, puedes volver a activarlos después)
const contacto = document.getElementById("btnContacto");
const info = document.getElementById("btnInfo");
if (contacto && info) {
  contacto.addEventListener("click", () => {
    alert("Puedes contactarnos en: soporte@siscom.com");
  });
  info.addEventListener("click", () => {
    alert("SISCOM ayuda en el control de medicación de pacientes adultos y geriátricos.");
  });
}

// ===== FUNCIONES PARA CONTRASEÑAS =====

// Mostrar / ocultar contraseña
function togglePassword(id, element) {
  const input = document.getElementById(id);
  const svg = element.querySelector("svg");

  if (input.type === "password") {
    input.type = "text";
    svg.innerHTML = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 4.54-5.94M1 1l22 22"/><path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"/>';
  } else {
    input.type = "password";
    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>';
  }
}

// Mostrar icono del ojo solo si el campo tiene texto
function toggleEyeVisibility(input) {
  const icon = input.parentElement.querySelector('.toggle-password');
  icon.style.display = input.value.trim() ? "block" : "none";
}

// Al cargar la página, ocultar todos los iconos
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-password").forEach(icon => {
    icon.style.display = "none";
  });
});
