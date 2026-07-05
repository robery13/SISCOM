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

// Mantener visible el icono del ojo en todos los campos de contraseña
function toggleEyeVisibility(input) {
  const container = input.closest(".password-container");
  if (!container) return;
  const icon = container.querySelector(".toggle-password");
  if (icon) icon.style.display = "flex";
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".password-container input").forEach((input) => {
    toggleEyeVisibility(input);
    input.addEventListener("input", () => toggleEyeVisibility(input));
  });
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
      const correoValido = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/.test(correo.toLowerCase());
      const passwordPresente = contra.length > 0;

      if (!correoValido && !passwordPresente) {
        showToast("Credenciales incorrectas.", "warning");
        document.getElementById("emailLogin")?.focus();
        return;
      }

      if (!correoValido) {
        showToast("Correo incorrecto.", "warning");
        document.getElementById("emailLogin")?.focus();
        return;
      }

      if (!passwordPresente) {
        showToast("Contrase\u00f1a incorrecta.", "warning");
        document.getElementById("passwordLogin")?.focus();
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
        const respuesta = await fetch(`${API_URL}/login`, {
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
              const redirigido = redirigirPorRol(data.usuario.rol);
              if (!redirigido) {
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
          // Manejo espec�fico de errores de autenticaci�n
          const ambosInvalidos = data.code === "AMBOS_INVALIDOS";
          const correoInvalido = data.code === "EMAIL_INVALIDO";
          const passwordInvalida = data.code === "PASSWORD_INVALIDA";

          if (ambosInvalidos) {
            showToast("Credenciales incorrectas.", "error");
          } else if (correoInvalido) {
            showToast("Correo incorrecto.", "error");
          } else if (passwordInvalida) {
            showToast("Contrase\u00f1a incorrecta.", "error");
          } else if (respuesta.status === 403) {
            showToast("Cuenta bloqueada. Contacta al administrador.", "error");
          } else if (respuesta.status === 429) {
            showToast("Demasiados intentos. Por favor, espera unos minutos.", "error");
          } else {
            showToast(String(data.mensaje || data.message || "Credenciales incorrectas."), "error");
          }
          
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
const API_URL = "https://siscom-4lbe.onrender.com";
const GOOGLE_CLIENT_ID_FALLBACK = "635878229812-0s9plecinj5aoufagei6rl0dk0bl1998.apps.googleusercontent.com";
let googleInitIntentos = 0;

// ================== RESTAURAR SESIÓN ("Recordarme") ==================
// Si "Recordarme" estaba activo, el token se guardó en localStorage y debe
// sobrevivir a cerrar el navegador. Si no estaba activo, el token vive en
// sessionStorage (solo dura mientras la pestaña siga abierta). En ambos casos,
// cada vez que se carga esta pantalla hay que revisar si ya existe una sesión
// válida en el servidor y, si es así, saltar el login y redirigir directo.

function redirigirPorRol(rol) {
  const rolNormalizado = String(rol || '').toLowerCase();
  if (rolNormalizado === 'usuario') {
    window.location.href = "../Management-Frontend/main_paciente.html";
  } else if (rolNormalizado === 'empleado') {
    window.location.href = "../Management-Backend/cuidador_backend.html";
  } else if (rolNormalizado === 'administrador') {
    window.location.href = "../Management-Backend/Admin_Backend.html";
  } else {
    return false;
  }
  return true;
}

function limpiarSesionGuardada() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('remember_me');
  localStorage.removeItem('session_start');
  localStorage.removeItem('usuario');
  sessionStorage.removeItem('auth_token');
}

async function restaurarSesionSiExiste() {
  // Prioridad: localStorage (Recordarme activo) y luego sessionStorage (sesión de esta pestaña).
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!token) return; // No hay sesión previa: se muestra la landing normal.

  try {
    const respuesta = await fetch(`${API_URL}/verificar-sesion`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await respuesta.json();

    if (!respuesta.ok || !data.ok) {
      // Token inválido, revocado o expirado: se limpia para no dejar datos obsoletos.
      limpiarSesionGuardada();
      return;
    }

    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!usuarioGuardado || !usuarioGuardado.rol) {
      limpiarSesionGuardada();
      return;
    }

    showToast("Sesión activa detectada. Redirigiendo...", "success");
    setTimeout(() => {
      const redirigido = redirigirPorRol(usuarioGuardado.rol);
      if (!redirigido) limpiarSesionGuardada();
    }, 800);

  } catch (error) {
    // Si el servidor no responde, no se bloquea al usuario: simplemente ve el login normal.
    console.error('No se pudo verificar la sesión guardada:', error);
  }
}

document.addEventListener("DOMContentLoaded", restaurarSesionSiExiste);

function guardarSesionGoogle(data, rememberMe) {
  if (data.usuario) {
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
  }

  if (!data.token) return;

  if (rememberMe) {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('remember_me', 'true');
    localStorage.setItem('session_start', Date.now().toString());
  } else {
    sessionStorage.setItem('auth_token', data.token);
    localStorage.setItem('remember_me', 'false');
  }
}

function redirigirPorRolGoogle(usuario) {
  if (!usuario || !usuario.rol) {
    showToast("No se pudo obtener el rol del usuario.", "error");
    return;
  }

  const rol = String(usuario.rol).toLowerCase();
  if (rol === 'usuario') {
    window.location.href = "../Management-Frontend/main_paciente.html";
  } else if (rol === 'empleado') {
    window.location.href = "../Management-Backend/cuidador_backend.html";
  } else if (rol === 'administrador') {
    window.location.href = "../Management-Backend/Admin_Backend.html";
  } else {
    showToast("Rol de usuario no reconocido.", "error");
  }
}

function obtenerDatosRegistroGoogle() {
  return {
    nombres: document.getElementById("nombres")?.value?.trim() || "",
    apellidos: document.getElementById("apellidos")?.value?.trim() || "",
    identidad: document.getElementById("identidad")?.value?.trim() || "",
    telefono: document.getElementById("telefono")?.value?.trim() || ""
  };
}

function limpiarMensajesCamposGoogle() {
  const identidadInput = document.getElementById("identidad");
  const telefonoInput = document.getElementById("telefono");
  if (identidadInput) identidadInput.setCustomValidity("");
  if (telefonoInput) telefonoInput.setCustomValidity("");
}

function validarCamposGoogleRegistro(datos) {
  const identidadInput = document.getElementById("identidad");
  const telefonoInput = document.getElementById("telefono");

  const identidadLimpia = String(datos.identidad || "").replace(/\D/g, "");
  const telefonoLimpio = String(datos.telefono || "").replace(/\D/g, "");

  const identidadValida = /^\d{13}$/.test(identidadLimpia);
  const telefonoValido = /^\d{8}$/.test(telefonoLimpio);

  if (identidadInput) {
    identidadInput.setCustomValidity(identidadValida ? "" : "Para Google, completa identidad con 13 digitos.");
  }

  if (telefonoInput) {
    telefonoInput.setCustomValidity(telefonoValido ? "" : "Para Google, completa telefono con 8 digitos.");
  }

  if (!identidadValida && identidadInput) {
    identidadInput.reportValidity();
    identidadInput.focus();
    return false;
  }

  if (!telefonoValido && telefonoInput) {
    telefonoInput.reportValidity();
    telefonoInput.focus();
    return false;
  }

  return true;
}

async function autenticarConGoogle(credentialResponse) {
  const idToken = credentialResponse?.credential;
  if (!idToken) {
    showToast("No se pudo obtener credencial de Google.", "error");
    return;
  }

  const rememberMe = document.getElementById("rememberMe")?.checked || false;
  const datosRegistroGoogle = obtenerDatosRegistroGoogle();
  const modalRegistroActivo = document.getElementById("modalRegistro")?.classList.contains("active");
  const googleFlow = modalRegistroActivo ? "register" : "login";

  // Solo exigir identidad/telefono cuando el flujo viene del formulario de registro
  if (modalRegistroActivo) {
    limpiarMensajesCamposGoogle();
    if (!validarCamposGoogleRegistro(datosRegistroGoogle)) {
      showToast("Para continuar con Google, completa los campos sugeridos.", "warning");
      return;
    }
  }

  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        rememberMe,
        googleFlow,
        ...datosRegistroGoogle
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast(data.mensaje || "No se pudo autenticar con Google.", "error");
      return;
    }

    guardarSesionGoogle(data, rememberMe);
    showToast(data.usuarioCreado ? "Cuenta creada con Google. Redirigiendo..." : "Inicio con Google exitoso. Redirigiendo...", "success");
    setTimeout(() => redirigirPorRolGoogle(data.usuario), 1200);
  } catch (error) {
    showToast("Error de conexion con el servidor.", "error");
  }
}

async function inicializarGoogleSignIn() {
  const loginContainer = document.getElementById("googleLoginButton");
  const registroContainer = document.getElementById("googleRegistroButton");
  if (!loginContainer && !registroContainer) return;

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    if (googleInitIntentos < 12) {
      googleInitIntentos += 1;
      setTimeout(inicializarGoogleSignIn, 300);
      return;
    }

    showToast("No se pudo cargar Google Sign-In.", "warning");
    return;
  }

  googleInitIntentos = 0;

  let clientId = GOOGLE_CLIENT_ID_FALLBACK;

  try {
    const res = await fetch(`${API_URL}/auth/config`);
    const data = await res.json();
    if (res.ok && data?.googleClientId) {
      clientId = data.googleClientId;
    }
  } catch (error) {
    // Si el backend no responde, usamos el client id de respaldo.
  }

  if (!clientId) {
    showToast("No se encontro GOOGLE_CLIENT_ID para Google Sign-In.", "warning");
    return;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: autenticarConGoogle
  });

  if (loginContainer) {
    window.google.accounts.id.renderButton(loginContainer, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 300
    });
  }

  if (registroContainer) {
    window.google.accounts.id.renderButton(registroContainer, {
      theme: "filled_blue",
      size: "large",
      text: "signup_with",
      shape: "pill",
      width: 300
    });
  }
}

document.addEventListener("DOMContentLoaded", inicializarGoogleSignIn);

const linkForgot = document.querySelector(".forgot-link");
const formLoginCard = document.querySelector("#formLogin")?.closest(".form-card");

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
if (linkForgot && formRecuperar && formLoginCard && document.getElementById("formCorreo")) {
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
function esNombrePersonaValido(valor) {
  const nombreRegex = /^[A-Za-z\u00C0-\u017F]+(?:[ '\-][A-Za-z\u00C0-\u017F]+)*$/;
  return nombreRegex.test((valor || "").trim());
}

function esCorreoValido(valor) {
  const emailRegex = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
  const correo = (valor || "").trim().toLowerCase();
  if (!emailRegex.test(correo)) return false;

  const dominiosPermitidos = new Set([
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com"
  ]);

  const dominio = correo.split("@")[1] || "";
  return dominiosPermitidos.has(dominio);
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
    const nombresValidos = esNombrePersonaValido(nombres);
    const apellidosValidos = esNombrePersonaValido(apellidos);
    const correoValido = esCorreoValido(email);
    const passwordValida = passwordEsValida();

    if (!nombresValidos) {
      showToast("El campo nombres solo permite letras y espacios v�lidos.", "warning");
      document.getElementById("nombres").focus();
      return;
    }

    if (!apellidosValidos) {
      showToast("El campo apellidos solo permite letras y espacios v�lidos.", "warning");
      document.getElementById("apellidos").focus();
      return;
    }

    if (!correoValido && !passwordValida) {
      showToast("Correo y contrase�a incorrectos. Verifica ambos campos.", "warning");
      document.getElementById("emailRegistro").focus();
      return;
    }

    if (!correoValido) {
      showToast("Correo invalido.", "warning");
      document.getElementById("emailRegistro").focus();
      return;
    }

    if (!passwordValida) {
      showToast("La contrase�a no cumple con los requisitos de seguridad.", "warning");
      document.getElementById("passwordRegistro").focus();
      return;
    }

    if (password !== confirmarPassword) {
      showToast("Las contraseñas no coinciden", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombres, apellidos, identidad, telefono, email: email.toLowerCase(), password })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Registro exitoso. Ahora puedes iniciar sesion.", "success");
        formRegistro.reset();
        // Resetear validación visual de contraseña
        document.querySelectorAll(".requisito-item").forEach(item => {
          item.classList.remove("cumplido");
          item.querySelector(".requisito-icono").textContent = "✗";
        });
        document.getElementById("passwordMatchMessage").style.display = "none";
        // Abrir formulario de inicio de sesión tras registro exitoso t
        setTimeout(() => {
          if (typeof cerrarModal === "function") cerrarModal("modalRegistro");
          if (typeof abrirModal === "function") abrirModal("modalLogin");
          const emailLogin = document.getElementById("emailLogin");
          if (emailLogin) {
            emailLogin.value = email.toLowerCase();
            emailLogin.focus();
          }
        }, 1200);
      } else {  
        showToast(data.message || "Error en el registro", "error");
      }
    } catch (err) {
      // console.error(err);
      showToast("Error de conexión con el servidor", "error");
    }
  });
}
