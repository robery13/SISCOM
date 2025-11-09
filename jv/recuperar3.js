document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPass");
  const msg = document.getElementById("mensaje");

  const urlParams = new URLSearchParams(window.location.search);
  const correo = urlParams.get("email");

  if (!correo) {
    msg.textContent = "Correo no especificado. Regresa al paso anterior.";
    return;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const p1 = document.getElementById("pass1").value.trim();
    const p2 = document.getElementById("pass2").value.trim();

    if (!p1 || !p2) {
      msg.style.color = "red";
      msg.textContent = "Completa ambos campos.";
      return;
    }

    if (p1 !== p2) {
      msg.style.color = "red";
      msg.textContent = "Las contraseñas no coinciden.";
      return;
    }

    msg.style.color = "blue";
    msg.textContent = "Actualizando contraseña...";

    try {
      const res = await fetch("http://localhost:3000/actualizar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, nuevaPassword: p1 }),
      });

      const data = await res.json();
      if (data.ok) {
        msg.style.color = "green";
        msg.textContent = "Contraseña actualizada. Redirigiendo al login...";
        setTimeout(() => window.location.href = "login.html", 2000);
      } else {
        msg.style.color = "red";
        msg.textContent = data.message || "Error al actualizar.";
      }
    } catch (err) {
      msg.style.color = "red";
      msg.textContent = "Error de conexión.";
      console.error(err);
    }
  });
});
