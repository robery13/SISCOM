document.addEventListener("DOMContentLoaded", () => {
  console.log("rec_contra.js cargado correctamente y DOM listo");

  const formCorreo = document.getElementById("formCorreo");
  const formToken = document.getElementById("formToken");
  const formNuevaPass = document.getElementById("formNuevaPass");
  const mensaje = document.getElementById("mensaje");

  let correoGlobal = ""; // Guardamos el correo ingresado

  // Función para mostrar mensajes y guardar en localStorage
  function showMessage(msg, color = "red") {
    mensaje.textContent = msg;
    mensaje.style.color = color;

    // Guardar último mensaje de error o info
    localStorage.setItem(
      "ultimoMensajeRecContra",
      JSON.stringify({ msg, color, timestamp: Date.now() })
    );
  }

  // Recuperar último mensaje persistido
  const last = localStorage.getItem("ultimoMensajeRecContra");
  if (last) {
    const { msg, color } = JSON.parse(last);
    mensaje.textContent = msg;
    mensaje.style.color = color;
    console.log("Último mensaje recuperado de localStorage:", msg);
  }

  // ------------------------
  // PASO 1: Enviar correo
  if (formCorreo) {
    formCorreo.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMessage("Enviando código...", "blue");

      const correo = document.getElementById("correo").value.trim();
      if (!correo) return showMessage("Ingresa un correo válido");

      console.log("Intentando enviar token a:", correo);

      try {
        const res = await fetch("http://localhost:3000/enviar-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo }),
        });
        const data = await res.json();
        console.log("Respuesta servidor enviar-token:", data);

        if (data.ok) {
          correoGlobal = correo;
          formCorreo.style.display = "none";
          formToken.style.display = "flex";
          showMessage("Código enviado a tu correo", "green");
        } else {
          showMessage(data.message);
        }
      } catch (err) {
        console.error("Error fetch enviar-token:", err);
        showMessage("Error al enviar el código");
      }
    });
  } else {
    console.error("formCorreo no encontrado");
  }

  // ------------------------
  // PASO 2: Verificar token
  if (formToken) {
    formToken.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMessage("Verificando código...", "blue");

      const token = document.getElementById("token").value.trim();
      if (!token) return showMessage("Ingresa el código");

      console.log("Intentando verificar token:", token);

      try {
        const res = await fetch("http://localhost:3000/verificar-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: correoGlobal, tokenIngresado: token }),
        });
        const data = await res.json();
        console.log("Respuesta servidor verificar-token:", data);

        if (data.ok) {
          formToken.style.display = "none";
          formNuevaPass.style.display = "flex";
          showMessage("Token verificado. Ingresa tu nueva contraseña", "green");
        } else {
          showMessage(data.message);
        }
      } catch (err) {
        console.error("Error fetch verificar-token:", err);
        showMessage("Error al verificar el código");
      }
    });
  } else {
    console.error("formToken no encontrado");
  }

  // ------------------------
  // PASO 3: Actualizar contraseña
  if (formNuevaPass) {
    formNuevaPass.addEventListener("submit", async (e) => {
      e.preventDefault();
      showMessage("Actualizando contraseña...", "blue");

      const nuevaPassword = document.getElementById("nuevaPassword").value.trim();
      if (!nuevaPassword) return showMessage("La contraseña no puede estar vacía");

      console.log("Intentando actualizar contraseña para:", correoGlobal);

      try {
        const res = await fetch("http://localhost:3000/actualizar-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: correoGlobal, nuevaPassword }),
        });
        const data = await res.json();
        console.log("Respuesta servidor enviar-token:", data);
     

        if (data.ok) {
          showMessage("Contraseña actualizada. Redirigiendo al login...", "green");
          setTimeout(() => {
            window.location.href = "login.html";
          }, 2000);
        } else {
          showMessage(data.message);
        }
      } catch (err) {
        console.error("Error fetch actualizar-password:", err);
        showMessage("Error al actualizar la contraseña");
      }
    });
  } else {
    console.error("formNuevaPass no encontrado");
  }
});
