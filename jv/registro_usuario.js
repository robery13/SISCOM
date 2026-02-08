// -------------------- SHOW TOAST --------------------
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

document.addEventListener("DOMContentLoaded", () => {
  const formRegistro = document.getElementById("formRegistroPrivilegio");

  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombres = document.getElementById("nombres").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const identidad = document.getElementById("identidad").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("emailRegistro").value.trim();
    const password = document.getElementById("passwordRegistro").value;
    const confirmarPassword = document.getElementById("confirmarPassword").value;

    if (password !== confirmarPassword) {
      showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    if (!nombres || !apellidos || !identidad || !telefono || !email || !password) {
      showToast("Por favor, complete todos los campos.", "warning");
      return;
    }

    const datos = { nombres, apellidos, identidad, telefono, email, password };

    try {
      const respuesta = await fetch("http://localhost:3000/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const result = await respuesta.json();
      console.log("Respuesta del servidor:", result);

      if (result.ok) {
        showToast(result.mensaje, "success");
        formRegistro.reset();
        setTimeout(() => {
  window.location.href = "Proyecto_SISCOM.html"; // Cambia por el HTML que quieras abrir
}, 2500);

      } else {
        showToast(result.mensaje, "error");
      }
    } catch (error) {
      //console.error("Error en la conexión o fetch:", error);
      showToast("Error al conectar con el servidor.", "error");
    }
  });
});

// Mostrar/ocultar contraseña
function togglePassword(idInput, span) {
  const input = document.getElementById(idInput);
  input.type = input.type === "password" ? "text" : "password";
}

function toggleEyeVisibility(input) {
  // Lógica opcional
}
