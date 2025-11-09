document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formToken");
  const msg = document.getElementById("mensaje");

  const urlParams = new URLSearchParams(window.location.search);
  const correo = urlParams.get("email");

  if (!correo) {
    msg.textContent = "Correo no especificado. Regresa al paso anterior.";
    return;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const token = document.getElementById("token").value.trim();

    msg.style.color = "blue";
    msg.textContent = "Verificando...";

    try {
      const res = await fetch("http://localhost:3000/verificar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, tokenIngresado: token }),
      });

      const data = await res.json();
      if (data.ok) {
        msg.style.color = "green";
        msg.textContent = "Código verificado. Redirigiendo...";
        setTimeout(() => {
          window.location.href = `recuperar3.html?email=${encodeURIComponent(correo)}`;
        }, 1500);
      } else {
        msg.style.color = "red";
        msg.textContent = data.message || "Código incorrecto.";
      }
    } catch (err) {
      msg.style.color = "red";
      msg.textContent = "Error de conexión.";
      console.error(err);
    }
  });
});
