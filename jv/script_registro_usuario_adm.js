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


// Espera a que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {

  const formRegistro = document.getElementById("formRegistroPrivilegio");

  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Recoger valores del formulario
    const nombres = document.getElementById("nombres").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const identidad = document.getElementById("identidad").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("emailRegistro").value.trim();
    const password = document.getElementById("passwordRegistro").value;
    const confirmarPassword = document.getElementById("confirmarPassword").value;
    const rol = document.getElementById("rol").value;

    // Validación simple de contraseñas
    if (password !== confirmarPassword) {
     
       showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    // Validación de campos vacíos (extra)
    if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
     
       showToast("Por favor, complete todos los campos.", "warning");
      return;
    }

    // Crear objeto con los datos
    const datos = {
      nombres,
      apellidos,
      identidad,
      telefono,
      email,
      password,
      rol
    };

    try {

     // console.log("Datos a enviar:", datos);

      // Enviar datos al backend
      const respuesta = await fetch("http://localhost:3000/registraradm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });

      const result = await respuesta.json();

      if (respuesta.ok) {
               showToast("Usuario registrado con éxito.", "success");
       
        formRegistro.reset(); // Limpiar formulario
      } else {
       
         showToast("Error al registrar el usuario.", "error");
      }

    } catch (error) {
     // console.error("Error al enviar datos:", error);
   
       showToast("No se pudo conectar con el servidor.", "error");
    }
  });

});

// Función para mostrar/ocultar contraseña
function togglePassword(idInput, span) {
  const input = document.getElementById(idInput);
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

// Opcional: ocultar el ícono si el input está vacío
function toggleEyeVisibility(input) {
  // Aquí podrías agregar lógica si quieres que el icono se oculte cuando el campo está vacío
}

