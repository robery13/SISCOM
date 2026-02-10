// ================== AÑO DINÁMICO ==================
document.getElementById("year").textContent = new Date().getFullYear();

// ================== TOAST ==================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  setTimeout(() => { // ⏳ Retraso de 2 segundos antes de mostrar el toast
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }, 2000);
}

// ================== CONTRASEÑAS ==================

// Mostrar / ocultar contraseña
function togglePassword(inputId, iconElement) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    iconElement.classList.add("active");
  } else {
    input.type = "password";
    iconElement.classList.remove("active");
  }
}

// Mostrar icono del ojo solo si hay texto
function toggleEyeVisibility(input) {
  const icon = input.parentElement.querySelector(".toggle-password");
  if (icon) icon.style.display = input.value.trim() ? "block" : "none";
}

// Al cargar la página, ocultar todos los iconos de contraseña
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".toggle-password").forEach(icon => icon.style.display = "none");
});

// ================== LOGIN ==================
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  const btnLogin = document.querySelector("#formLogin button[type='submit']");

  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();

      const correo = document.getElementById("emailLogin").value.trim();
      const contra = document.getElementById("passwordLogin").value.trim();

      if (!correo || !contra) {
        showToast("Por favor, complete todos los campos.", "warning");
        return;
      }

      //  Deshabilitar el botón para evitar spam
      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.style.opacity = "0.6";
        btnLogin.style.cursor = "not-allowed";
      }

      try {
        const respuesta = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: correo, password: contra })
        });

        const data = await respuesta.json();

        if (respuesta.ok && data.ok) {
          showToast("Inicio de sesión exitoso!", "success");
          setTimeout(() => {
            if (btnLogin) {
              btnLogin.disabled = false;
              btnLogin.style.opacity = "1";
              btnLogin.style.cursor = "pointer";
            }
          }, 2100);

          formLogin.reset();
          // Almacenar información del usuario en localStorage
          if (data.usuario) {
            localStorage.setItem('userName', data.usuario.nombres + ' ' + data.usuario.apellidos);
            localStorage.setItem('userRole', data.usuario.rol);
            localStorage.setItem('userId', String(data.usuario.id));
          }

          // Redirigir según el rol del usuario
          if (data.usuario && data.usuario.rol) {
            const rol = data.usuario.rol.toLowerCase(); // Para manejar mayúsculas/minúsculas
            if (rol === 'usuario') {
              window.location.href = "../Management-Frontend/main_paciente.html";
            } else if (rol === 'empleado') {
              window.location.href = "../Management-Backend/cuidador_backend.html";
            } else if (rol === 'administrador') {
              window.location.href = "../Management-Backend/Admin_Backend.html";
            } else {
              showToast("Rol de usuario no reconocido.", "error");
            }
          } else {
            showToast("Error al obtener información del usuario.", "error");
          }
        } else {
          showToast(data.message || "Correo o contraseña incorrectos.", "error");
          setTimeout(() => {
            if (btnLogin) {
              btnLogin.disabled = false;
              btnLogin.style.opacity = "1";
              btnLogin.style.cursor = "pointer";
            }
          }, 2100);
        }
      } catch (error) {
        // console.error("Error al conectar con el servidor:", error);
        showToast("No se pudo conectar con el servidor.", "warning");
        setTimeout(() => {
          if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.style.opacity = "1";
            btnLogin.style.cursor = "pointer";
          }
        }, 2100);
      }
    });
  }
});

// ================== RECUPERAR CONTRASEÑA ==================
const API_URL = "http://localhost:3000";

const linkForgot = document.querySelector(".forgot-link");
const formLoginCard = document.querySelector("#formLogin").closest(".form-card");

const formRecuperar = document.getElementById("formRecuperar");
const volverLogin = document.getElementById("volverLogin");

let correoActual = "";

// Función para mostrar solo un formulario dentro de la recuperación
function showForm(form) {
  [document.getElementById("formCorreo"), 
   document.getElementById("formToken"), 
   document.getElementById("formNuevaPassword")].forEach(f => f.style.display = "none");
  form.style.display = "block";
}

// Mostrar formulario de recuperación
if (linkForgot) {
  linkForgot.addEventListener("click", (e) => {
    e.preventDefault();
    formLoginCard.style.display = "none";
    formRecuperar.style.display = "block";
    showForm(document.getElementById("formCorreo"));
  });
}

// Volver al login
if (volverLogin) {
  volverLogin.addEventListener("click", (e) => {
    e.preventDefault();
    formRecuperar.style.display = "none";
    formLoginCard.style.display = "block";
  });
}

// Paso 1: enviar correo
const formCorreo = document.getElementById("formCorreo");
const botonEnviar = document.getElementById("btnEnviarCodigo");

if (formCorreo && botonEnviar) {
  botonEnviar.addEventListener("click", async (e) => {
    e.preventDefault();

    const correoInput = document.getElementById("correoRecuperacion");
    correoActual = correoInput.value.trim();

    if (!correoActual) {
      showToast("Ingrese un correo válido", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/enviar-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoActual })
      });

      const data = await res.json();
      // console.log("Respuesta de /enviar-token:", data); // 👈 depuración

      if (data.ok) {
        showToast("Código enviado correctamente al correo.", "success");
        // console.log("Mostrando formulario del token...");
        showForm(document.getElementById("formToken"));
      } else {
        showToast(data.message || "Error al enviar el correo.", "error");
      }

    } catch (err) {
      // console.error("Error de conexión:", err);
      showToast("Error de conexión con el servidor.", "error");
    }
  });
}

// Paso 2: verificar token
const formToken = document.getElementById("formToken");
if (formToken) {
  formToken.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tokenIngresado = document.getElementById("tokenIngresado").value.trim();

    if (!tokenIngresado) {
      showToast("Ingrese el código enviado al correo", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/verificar-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoActual, tokenIngresado })
      });

      const data = await res.json();

      if (data.ok) {
        showToast("Código verificado correctamente ", "success");
        showForm(document.getElementById("formNuevaPassword"));
      } else {
        showToast(data.message || "Token incorrecto o expirado.", "error");
      }
    } catch (err) {
      // console.error(err);
      showToast("Error al verificar el token.", "error");
    }
  });
}

// Paso 3: actualizar contraseña
const formNuevaPassword = document.getElementById("formNuevaPassword");
if (formNuevaPassword) {
  formNuevaPassword.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nuevaPass = document.getElementById("nuevaPassword").value.trim();

    if (!nuevaPass) {
      showToast("Ingrese una nueva contraseña", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/actualizar-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoActual, nuevaPassword: nuevaPass })
      });

      const data = await res.json();

      if (data.ok) {
        showToast("Contraseña actualizada con éxito", "success");
        formNuevaPassword.reset();
        formRecuperar.style.display = "none";
        formLoginCard.style.display = "block";
      } else {
        showToast(data.message || "Error al actualizar la contraseña.", "error");
      }
    } catch (err) {
      // console.error(err);
      showToast("Error de conexión al actualizar la contraseña.", "error");
    }
  });
}

// ================== REGISTRO ==================
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
      const res = await fetch("http://localhost:3000/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombres, apellidos, identidad, telefono, email, password })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Registro exitoso", "success");
        formRegistro.reset();
      } else {  
        showToast(data.message || "Error en el registro", "error");
      }
    } catch (err) {
      // console.error(err);
      showToast("Error de conexión con el servidor", "error");
    }
  });
}
