document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCorreo");
  const msg = document.getElementById("mensaje");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const correo = document.getElementById("correo").value.trim();

    msg.style.color = "blue";
    msg.textContent = "Enviando correo...";

    try {
      const res = await fetch("http://localhost:3000/enviar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });

      const data = await res.json();
      if (data.ok) {
        msg.style.color = "green";
        msg.innerHTML = `Correo enviado. Verifica tu bandeja.<br>
                         <button id="reenviar">Reenviar correo</button>`;
        document.getElementById("reenviar").addEventListener("click", () => form.requestSubmit());
      } else {
        msg.style.color = "red";
        msg.textContent = data.message || "Error al enviar el correo";
      }
    } catch (err) {
      msg.style.color = "red";
      msg.textContent = "Error de conexión con el servidor.";
      console.error(err);
    }
  });
});
