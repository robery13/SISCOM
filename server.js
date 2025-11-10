require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// aqui va la concexion de la DB
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT
});

//mensaje de error o exito de conexion
db.connect(err => {
  if (err) {
    console.error('Error al conectar a MySQL:', err);
  } else {
    console.log('Conexión a MySQL exitosa');
  }
});

// Puntero de guardado de medicamentos que ejecute el codigo
app.post('/guardarMedicamento', (req, res) => {
  //datos de los formularios
  const { nombre, dosis, frecuencia, hora } = req.body;

  if (!nombre || !dosis || !frecuencia || !hora) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  //codigo sql para insertar los datos en la base de datos
  const sql = 'INSERT INTO medicamentos (nombre, dosis, frecuencia, hora) VALUES (?, ?, ?, ?)';
  db.query(sql, [nombre, dosis, frecuencia, hora], (err, result) => {
    if (err) {
      //console.error(err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
    }
    res.json({ mensaje: 'Medicamento guardado correctamente' });
  });
});






//script login

// Verificar correo y contraseña al iniciar sesión
app.post('/login', (req, res) => {
  const { email, password } = req.body; // ✅ cambia 'correo' por 'email'
  

  // Consulta SQL para buscar el usuario por email
  const sql = 'SELECT * FROM usuarios WHERE email = ?';

  db.query(sql, [email], (err, results) => {
    if (err) {
      //console.error('Error al consultar la base de datos:', err);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    // Si no se encontró ningún usuario con ese email
    if (results.length === 0) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    const usuario = results[0];

    // Comparar contraseñas (por ahora sin hash)
    if (password !== usuario.password) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    // Si todo está correcto
    res.status(200).json({
      ok: true,
      mensaje: 'Inicio de sesión exitoso',
      usuario
    });
  });
});



// Registro
app.post("/registrar", (req, res) => {
  const { nombres, apellidos, identidad, telefono, email, password } = req.body;

  // Verificar si el correo o identidad ya existen
  const verificarSql = "SELECT * FROM usuarios WHERE email = ? OR identidad = ?";
  db.query(verificarSql, [email, identidad], (err, resultados) => {
    if (err) {
      //console.error("Error al verificar duplicados:", err);
      return res.json({ ok: false, mensaje: "Error al verificar datos" });
    }

    if (resultados.length > 0) {
      // Verificar cuál campo está duplicado
      const correoExiste = resultados.some((r) => r.email === email);
      const identidadExiste = resultados.some((r) => r.identidad === identidad);

      if (correoExiste && identidadExiste) {
        return res.json({ ok: false, mensaje: "El correo y la identidad ya están registrados" });
      } else if (correoExiste) {
        return res.json({ ok: false, mensaje: "El correo ya está registrado" });
      } else if (identidadExiste) {
        return res.json({ ok: false, mensaje: "La identidad ya está registrada" });
      }
    }

    // Si no hay duplicados, insertar el nuevo usuario
    const sql = `
      INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nombres, apellidos, identidad, telefono, email, password], (err, result) => {
      if (err) {
        //console.error("Error al registrar usuario:", err); 
        return res.json({ ok: false, mensaje: "Error al registrar usuario" });
      }

      res.json({ ok: true, mensaje: "Usuario registrado con éxito" });
    });
  });
});





// Registro de usuario con rol
app.post("/registraradm", (req, res) => {
  const { nombres, apellidos, identidad, telefono, email, password, rol } = req.body;

  // Validación básica
  if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  // SQL para insertar el usuario
  const sql = `
    INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password, rol)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

db.query(sql, [nombres, apellidos, identidad, telefono, email, password, rol], (err, result) => {
  if (err) {
    //console.error("Error SQL completo:", err); // <-- imprime todo
    return res.status(500).json({ error: "Error al registrar usuario en la base de datos.", detalle: err.message });
  }
  res.status(200).json({ mensaje: "Usuario registrado con éxito." });
});

});




//esto siempre al final sino todo hace KABOOOM *le da un infarto*
app.listen(3000, () => {
  //console.log('Servidor corriendo en http://localhost:3000');
});

// itream parte 

//script formularios

//  RUTA 2: GUARDAR EN Registro_medicamentos
app.post('/Registro_medicamentos', (req, res) => {
  const { nombre, dosis, frecuencia_horas, hora } = req.body;

  if (!nombre || !dosis || !frecuencia_horas || !hora) {
    return res.status(400).json({ mensaje: ' Campos incompletos' });
  }

  const sql = 'INSERT INTO Registro_medicamentos (nombre, dosis, frecuencia_horas, hora) VALUES (?, ?, ?, ?)';
  db.query(sql, [nombre, dosis, frecuencia_horas, hora], (err, result) => {
    if (err) {
      //console.error(' Error al guardar en Registro_medicamentos:', err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
    }
    res.json({ mensaje: ' Medicamento registrado correctamente en Registro_medicamentos' });
  });
});

//  RUTA 3: GUARDAR EN inventario
app.post('/inventario', (req, res) => {
  const { nombre, cantidad, consumo_por_dosis } = req.body;

  if (!nombre || !cantidad || !consumo_por_dosis) {
    return res.status(400).json({ mensaje: ' Campos incompletos' });
  }

  const sql = 'INSERT INTO inventario (nombre, cantidad, consumo_por_dosis) VALUES (?, ?, ?)';
  db.query(sql, [nombre, cantidad, consumo_por_dosis], (err, result) => {
    if (err) {
      //console.error(' Error al guardar en inventario:', err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
    }
    res.json({ mensaje: ' Medicamento agregado al inventario correctamente' });
  });
});


const nodemailer = require("nodemailer");
const crypto = require("crypto");

let tokens = {}; // en memoria; si prefieres, puedes usar una tabla "tokens"

// 1️⃣ Enviar token
app.post("/enviar-token", (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.json({ ok: false, message: "Correo requerido" });

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [correo], async (err, results) => {
    if (err) return res.json({ ok: false, message: "Error DB"});
    if (results.length === 0)
      return res.json({ ok: false, message: "No existe una cuenta con ese correo" });

    const token = crypto.randomBytes(4).toString("hex");
    tokens[correo] = { token, expires: Date.now() + 15 * 60 * 1000 }; // 15 min

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });

   




    await transporter.sendMail({
      from: `"SISCOM" <${process.env.MAIL_USER}>`,
      to: correo,
      subject: "Recuperación de contraseña",
      html: `
        <p>Tu código de verificación es:</p>
        <h3>${token}</h3>
        <p>O haz clic aquí para continuar:</p>
    
        <p>El código expira en 15 minutos.</p>
      `,
    });

    res.json({ ok: true, message: "Correo de verificación enviado" });
  });
});

// 2️⃣ Verificar token
app.post("/verificar-token", (req, res) => {
  const { correo, tokenIngresado } = req.body;
  const record = tokens[correo];

  if (!record) return res.json({ ok: false, message: "Token no encontrado" });
  if (Date.now() > record.expires)
    return res.json({ ok: false, message: "Token expirado" });
  if (record.token !== tokenIngresado)
    return res.json({ ok: false, message: "Token incorrecto" });

  res.json({ ok: true, message: "Token verificado" });
});

// 3️⃣ Actualizar contraseña
app.post("/actualizar-password", (req, res) => {
  const { correo, nuevaPassword } = req.body;
  if (!correo || !nuevaPassword)
    return res.json({ ok: false, message: "Datos incompletos" });

  const sql = "UPDATE usuarios SET password = ? WHERE email = ?";
  db.query(sql, [nuevaPassword, correo], (err, result) => {
    if (err) return res.json({ ok: false, message: "Error al actualizar" });
    delete tokens[correo]; // limpiar token
    res.json({ ok: true, message: "Contraseña actualizada correctamente" });
  });
});
