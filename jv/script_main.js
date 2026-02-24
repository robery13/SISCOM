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

// ================== VALIDACIÓN DE CONTRASEÑA ==================

// Validar requisitos de contraseña en tiempo real
function validarPasswordEnTiempo() {
  const password = document.getElementById("passwordRegistro").value;
  
  // Requisitos
  const tieneLongitud = password.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneMinuscula = /[a-z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  // Actualizar UI para cada requisito
  actualizarRequisitoUI("req-longitud", tieneLongitud);
  actualizarRequisitoUI("req-mayuscula", tieneMayuscula);
  actualizarRequisitoUI("req-minuscula", tieneMinuscula);
  actualizarRequisitoUI("req-numero", tieneNumero);
  actualizarRequisitoUI("req-especial", tieneEspecial);
  
  // Validar coincidencia si ya hay algo en confirmar
  const confirmar = document.getElementById("confirmarPassword").value;
  if (confirmar.length > 0) {
    validarCoincidenciaPassword();
  }
}

// Actualizar el estado visual de un requisito
function actualizarRequisitoUI(id, cumplido) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  
  const icono = elemento.querySelector(".requisito-icono");
  
  if (cumplido) {
    elemento.classList.add("cumplido");
    icono.textContent = "✓";
  } else {
    elemento.classList.remove("cumplido");
    icono.textContent = "✗";
  }
}

// Validar coincidencia de contraseñas
function validarCoincidenciaPassword() {
  const password = document.getElementById("passwordRegistro").value;
  const confirmar = document.getElementById("confirmarPassword").value;
  const mensajeDiv = document.getElementById("passwordMatchMessage");
  
  if (confirmar.length === 0) {
    mensajeDiv.style.display = "none";
    mensajeDiv.className = "password-match-message";
    return;
  }
  
  if (password === confirmar) {
    mensajeDiv.textContent = "✓ Las contraseñas coinciden";
    mensajeDiv.className = "password-match-message coincide";
  } else {
    mensajeDiv.textContent = "✗ Las contraseñas no coinciden";
    mensajeDiv.className = "password-match-message no-coincide";
  }
}

// Verificar si todos los requisitos de contraseña se cumplen
function passwordEsValida() {
  const password = document.getElementById("passwordRegistro").value;
  
  const tieneLongitud = password.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneMinuscula = /[a-z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return tieneLongitud && tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
}


// ================== LOGIN ==================
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  const btnLogin = document.querySelector("#formLogin button[type='submit']");

  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();

      const correo = document.getElementById("emailLogin").value.trim();
      const contra = document.getElementById("passwordLogin").value.trim();
      const rememberMe = document.getElementById("rememberMe")?.checked || false;

      // Validación de campos
      if (!correo) {
        showToast("Por favor, ingresa tu correo electrónico.", "warning");
        document.getElementById("emailLogin")?.focus();
        return;
      }

      if (!contra) {
        showToast("Por favor, ingresa tu contraseña.", "warning");
        document.getElementById("passwordLogin")?.focus();
        return;
      }

      // Validación de formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        showToast("Por favor, ingresa un correo electrónico válido.", "warning");
        document.getElementById("emailLogin")?.focus();
        return;
      }

      //  Deshabilitar el botón para evitar spam
      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.style.opacity = "0.6";
        btnLogin.style.cursor = "not-allowed";
        btnLogin.textContent = "Verificando...";
      }

      try {
        const respuesta = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: correo, password: contra, rememberMe: rememberMe })
        });

        const data = await respuesta.json();

        if (respuesta.ok && data.ok) {
          showToast("¡Inicio de sesión exitoso! Redirigiendo...", "success");
          
          // Almacenar información del usuario
          if (data.usuario) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
          }

          // Almacenar token de autenticación
          if (data.token) {
            if (rememberMe) {
              // Si "Recordarme" está activo, guardar en localStorage (persistente)
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('remember_me', 'true');
              localStorage.setItem('session_start', Date.now().toString());
            } else {
              // Si no, guardar en sessionStorage (se borra al cerrar navegador)
              sessionStorage.setItem('auth_token', data.token);
              localStorage.setItem('remember_me', 'false');
            }
          }

          // Redirigir según el rol del usuario después de un breve delay
          setTimeout(() => {
            if (data.usuario && data.usuario.rol) {
              const rol = data.usuario.rol.toLowerCase();
              if (rol === 'usuario') {
                window.location.href = "../Management-Frontend/main_paciente.html";
              } else if (rol === 'empleado') {
                window.location.href = "../Management-Backend/cuidador_backend.html";
              } else if (rol === 'administrador') {
                window.location.href = "../Management-Backend/Admin_Backend.html";
              } else {
                showToast("Rol de usuario no reconocido.", "error");
                if (btnLogin) {
                  btnLogin.disabled = false;
                  btnLogin.style.opacity = "1";
                  btnLogin.style.cursor = "pointer";
                  btnLogin.textContent = "Entrar";
                }
              }
            } else {
              showToast("Error al obtener información del usuario.", "error");
              if (btnLogin) {
                btnLogin.disabled = false;
                btnLogin.style.opacity = "1";
                btnLogin.style.cursor = "pointer";
                btnLogin.textContent = "Entrar";
              }
            }
          }, 1500);

        } else {
          // Manejo específico de errores de autenticación
          let errorMessage = data.message || "Correo o contraseña incorrectos.";
          
          if (respuesta.status === 401) {
            errorMessage = "Credenciales inválidas. Verifica tu correo y contraseña.";
          } else if (respuesta.status === 403) {
            errorMessage = "Cuenta bloqueada. Contacta al administrador.";
          } else if (respuesta.status === 429) {
            errorMessage = "Demasiados intentos. Por favor, espera unos minutos.";
          }
          
          showToast(errorMessage, "error");
          
          // Restaurar botón
          setTimeout(() => {
            if (btnLogin) {
              btnLogin.disabled = false;
              btnLogin.style.opacity = "1";
              btnLogin.style.cursor = "pointer";
              btnLogin.textContent = "Entrar";
            }
          }, 2100);
        }
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        
        let errorMsg = "No se pudo conectar con el servidor.";
        if (error.name === 'TypeError') {
          errorMsg = "Error de conexión. Verifica tu internet o que el servidor esté activo.";
        }
        
        showToast(errorMsg, "warning");
        
        setTimeout(() => {
          if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.style.opacity = "1";
            btnLogin.style.cursor = "pointer";
            btnLogin.textContent = "Entrar";
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

    // Validar que todos los requisitos de contraseña se cumplan
    if (!passwordEsValida()) {
      showToast("La contraseña no cumple con todos los requisitos de seguridad", "warning");
      document.getElementById("passwordRegistro").focus();
      return;
    }

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
        // Resetear validación visual de contraseña
        document.querySelectorAll(".requisito-item").forEach(item => {
          item.classList.remove("cumplido");
          item.querySelector(".requisito-icono").textContent = "✗";
        });
        document.getElementById("passwordMatchMessage").style.display = "none";
      } else {  
        showToast(data.message || "Error en el registro", "error");
      }
    } catch (err) {
      // console.error(err);
      showToast("Error de conexión con el servidor", "error");
    }
  });
}
