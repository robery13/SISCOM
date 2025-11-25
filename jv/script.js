// script.js

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



document.addEventListener("DOMContentLoaded", () => {
  const guardarBtn = document.getElementById("guardarBtn");

  // RECOGE LOS DATOS DEL FORMULARIO Y LOS ENVÍA AL SERVIDOR
  guardarBtn.addEventListener("click", async () => {
    const nombre = document.getElementById("nombre").value.trim();
    const dosis = document.getElementById("dosis").value.trim();
    const frecuencia = document.getElementById("frecuencia").value;
    const hora = document.getElementById("hora").value;

    // Validación básica
    if (!nombre || !dosis || !frecuencia || !hora) {
      showToast("Por favor, complete todos los campos.", "warning");
      return; 
    }

    // Estructura de los datos a enviar
    const medicamento = { nombre, dosis, frecuencia, hora };

    // Envía los datos al puntero guardarMedicamento en server.js
    try {
      const respuesta = await fetch("http://localhost:3000/guardarMedicamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(medicamento)
      });

      if (respuesta.ok) {
        const data = await respuesta.json();
        showToast("Medicamento guardado correctamente", "success");
       // console.log("Servidor:", data);

        // Limpia el formulario
        document.getElementById("nombre").value = "";
        document.getElementById("dosis").value = "";
        document.getElementById("frecuencia").selectedIndex = 0;
        document.getElementById("hora").value = "";
      } else {
        showToast("Error al guardar el medicamento.", "error");
      }
    } catch (error) {
     // console.error("Error al conectar con el servidor:", error);
      showToast("No se pudo conectar con el servidor.", "error");
    }
  });
});
