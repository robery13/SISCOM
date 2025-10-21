// script.js
// Archivo principal de funcionalidades del sistema SISCOM

document.addEventListener('DOMContentLoaded', () => {
  console.log("SISCOM Web cargado correctamente.");

  // Ejemplo de mensaje de bienvenida temporal
  const bienvenida = document.querySelector('.presentacion h2');
  if (bienvenida) {
    bienvenida.textContent += " ";
  }
});
