// Mostrar año dinámico
document.getElementById("year").textContent = new Date().getFullYear();



// -------------------- SHOW TOAST --------------------
// === Función para mostrar notificaciones internas (toasts) ===
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.textContent = message;

  container.appendChild(toast);

  // Mostrar con animación
  setTimeout(() => toast.classList.add("show"), 100);

  // Desaparecer después de 3 segundos
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

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




//parte del script para server.js
// script.js

// Espera a que todo el contenido del DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");

  // Verifica que el formulario exista antes de agregar eventos
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault(); // evita recargar la página

      // Capturar los datos del formulario
      const correo = document.getElementById("emailLogin").value.trim();
      const contra = document.getElementById("passwordLogin").value.trim();

      // Validar campos vacíos
      if (!correo || !contra) {
         showToast("Por favor, complete todos los campos.", "warning");
        return;
      }

      // Crear el objeto con los datos
      const datos_login = {
        email: correo,
        password: contra
      };

      try {
        // Enviar los datos al backend
        const respuesta = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos_login)
        });

        if (respuesta.ok) {
          const data = await respuesta.json();
      
         showToast("Inicio de sesion exitoso!.", "success");

          formLogin.reset(); // Limpia el formulario


           // Redirigir al menú
window.location.href = "..//registro/Registro.html";




        } else {
           showToast("Correo o contraseña incorrectos.", "error");
        }
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        
        showToast("No se pudo conectar con el servidor.", "warning");
      }
    });
  }
});


// ==== FUNCIÓN PARA MOSTRAR/OCULTAR CONTRASEÑA ====
function togglePassword(inputId, iconElement) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    iconElement.classList.add("active");
  } else {
    input.type = "password";
    iconElement.classList.remove("active");
  }
}

// ==== FUNCIÓN PARA MOSTRAR EL ÍCONO DEL OJO AL ESCRIBIR ====
function toggleEyeVisibility(input) {
  const eyeIcon = input.parentElement.querySelector(".toggle-password");
  eyeIcon.style.display = input.value ? "block" : "none";
}


const formRegistro = document.getElementById("formRegistro");
  if (formRegistro) {
    formRegistro.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombres = document.getElementById("nombres").value.trim();
      const apellidos = document.getElementById("apellidos").value.trim();
      const identidad = document.getElementById("identidad").value.trim();
      const telefono = document.getElementById("telefono").value.trim();
      const email = document.getElementById("emailRegistro").value.trim();
      const password = document.getElementById("passwordRegistro").value.trim();
      const confirmarPassword = document.getElementById("confirmarPassword").value.trim();

      if (password !== confirmarPassword) {
        showToast("Las contraseñas no coinciden", "warning");
        return;
      }

      try {
        const respuesta = await fetch("http://localhost:3000/registrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombres,
            apellidos,
            identidad,
            telefono,
            email,
            password,
          }),
        });

        if (respuesta.ok) {
          const data = await respuesta.json();
           showToast("Registro exitoso", "success");
          console.log("Nuevo usuario:", data);
          formRegistro.reset();
        } else {
        
           showToast("Error al registrar al usuario", "error");
        }
      } catch (error) {
        console.error("Error al registrar:", error);
        showToast("Error de conexión con el servidor", "error");
   
      }
    });
  }

