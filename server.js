const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configura tu conexión MySQL
const db = mysql.createConnection({
 
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a MySQL:', err);
  } else {
    console.log('Conexión a MySQL exitosa');
  }
});

// Ruta para guardar medicamento
app.post('/guardarMedicamento', (req, res) => {
  const { nombre, dosis, frecuencia, hora } = req.body;

  if (!nombre || !dosis || !frecuencia || !hora) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = 'INSERT INTO medicamentos (nombre, dosis, frecuencia, hora) VALUES (?, ?, ?, ?)';
  db.query(sql, [nombre, dosis, frecuencia, hora], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
    }
    res.json({ mensaje: 'Medicamento guardado correctamente' });
  });
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
