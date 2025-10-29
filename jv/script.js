// script.js

document.addEventListener("DOMContentLoaded", () => {
  const guardarBtn = document.getElementById("guardarBtn");

  //RECOGE LOS DATOS DEL FORMULARIO Y LOS ENVIA AL SERVIDOR
  guardarBtn.addEventListener("click", async () => {
    const nombre = document.getElementById("nombre").value.trim();
    const dosis = document.getElementById("dosis").value.trim();
    const frecuencia = document.getElementById("frecuencia").value;
    const hora = document.getElementById("hora").value;

    // Validación básica
    if (!nombre || !dosis || !frecuencia || !hora) {
      alert("Por favor, complete todos los campos.");
      return;
    }
    
//estructura de los datos a enviar
    const medicamento = { nombre, dosis, frecuencia, hora };


    //envia los datos al puntero guardarMedicamento en server.js
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
        alert("Medicamento guardado correctamente");
        console.log("Servidor:", data);

        // Limpia el formulario
        document.getElementById("nombre").value = "";
        document.getElementById("dosis").value = "";
        document.getElementById("frecuencia").selectedIndex = 0;
        document.getElementById("hora").value = "";

      } else {
        alert("Error al guardar el medicamento.");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      alert("No se pudo conectar con el servidor.");
    }
  });
});
