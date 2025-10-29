// Espera a que el DOM cargue
document.addEventListener("DOMContentLoaded", () => {

  const formRegistro = document.getElementById("formRegistroPrivilegio");

  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Recoger valores del formulario
    const nombres = document.getElementById("nombres").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const identidad = document.getElementById("identidad").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const email = document.getElementById("emailRegistro").value.trim();
    const password = document.getElementById("passwordRegistro").value;
    const confirmarPassword = document.getElementById("confirmarPassword").value;
    const rol = document.getElementById("rol").value;

    // Validación simple de contraseñas
    if (password !== confirmarPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    // Validación de campos vacíos (extra)
    if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
      alert("Por favor, complete todos los campos.");
      return;
    }

    // Crear objeto con los datos
    const datos = {
      nombres,
      apellidos,
      identidad,
      telefono,
      email,
      password,
      rol
    };

    try {

      console.log("Datos a enviar:", datos);

      // Enviar datos al backend
      const respuesta = await fetch("http://localhost:3000/registraradm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });

      const result = await respuesta.json();

      if (respuesta.ok) {
        alert(result.mensaje || "Usuario registrado con éxito.");
        formRegistro.reset(); // Limpiar formulario
      } else {
        alert(result.error || "Error al registrar el usuario.");
      }

    } catch (error) {
      console.error("Error al enviar datos:", error);
      alert("No se pudo conectar con el servidor.");
    }
  });

});

// Función para mostrar/ocultar contraseña
function togglePassword(idInput, span) {
  const input = document.getElementById(idInput);
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

// Opcional: ocultar el ícono si el input está vacío
function toggleEyeVisibility(input) {
  // Aquí podrías agregar lógica si quieres que el icono se oculte cuando el campo está vacío
}

