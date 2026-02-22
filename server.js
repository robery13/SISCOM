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
    
    // Crear tabla tomas_medicas si no existe
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS tomas_medicas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_receta INT NOT NULL,
        nombre_medicamento VARCHAR(255) NOT NULL,
        hora_toma TIME NOT NULL,
        fecha_toma DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tomas_usuario (id_usuario),
        INDEX idx_tomas_fecha (fecha_toma),
        INDEX idx_tomas_receta (id_receta)
      )
    `;
    db.query(createTableSql, (err) => {
      if (err) {
        console.error('Error al crear tabla tomas_medicas:', err);
      } else {
        console.log('Tabla tomas_medicas verificada/creada correctamente');
      }
    });
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
  const { email, password, rememberMe } = req.body;
  
  // Consulta SQL para buscar el usuario por email
  const sql = 'SELECT * FROM usuarios WHERE email = ?';

  db.query(sql, [email], (err, results) => {
    if (err) {
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

    // Generar token de autenticación
    const token = crypto.randomBytes(32).toString('hex');
    const expiresIn = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000; // 7 días o 30 minutos
    const expiresAt = Date.now() + expiresIn;
    
    // Guardar token en memoria
    authTokens[token] = {
      userId: usuario.id,
      email: usuario.email,
      expires: expiresAt,
      rememberMe: rememberMe || false
    };

    // Si todo está correcto
    res.status(200).json({
      ok: true,
      mensaje: 'Inicio de sesión exitoso',
      usuario,
      token
    });
  });
});

// Verificar sesión
app.post('/verificar-sesion', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'Token no proporcionado' });
  }

  const session = authTokens[token];
  
  if (!session) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión no válida' });
  }

  if (Date.now() > session.expires) {
    delete authTokens[token];
    return res.status(401).json({ ok: false, mensaje: 'Sesión expirada' });
  }

  res.json({ 
    ok: true, 
    mensaje: 'Sesión válida',
    userId: session.userId,
    expiresIn: session.expires - Date.now()
  });
});

// Renovar token
app.post('/renovar-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const oldToken = authHeader && authHeader.split(' ')[1];

  if (!oldToken) {
    return res.status(401).json({ ok: false, mensaje: 'Token no proporcionado' });
  }

  const session = authTokens[oldToken];
  
  if (!session) {
    return res.status(401).json({ ok: false, mensaje: 'Sesión no válida' });
  }

  // Generar nuevo token
  const newToken = crypto.randomBytes(32).toString('hex');
  const expiresIn = session.rememberMe ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
  const expiresAt = Date.now() + expiresIn;
  
  // Guardar nuevo token
  authTokens[newToken] = {
    userId: session.userId,
    email: session.email,
    expires: expiresAt,
    rememberMe: session.rememberMe
  };

  // Eliminar token antiguo
  delete authTokens[oldToken];

  res.json({
    ok: true,
    mensaje: 'Token renovado correctamente',
    token: newToken,
    expiresAt: expiresAt
  });
});

// Logout
app.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && authTokens[token]) {
    delete authTokens[token];
  }

  res.json({ ok: true, mensaje: 'Sesión cerrada correctamente' });
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

// Obtener todos los medicamentos registrados
app.get('/Registro_medicamentos', (req, res) => {
  const sql = 'SELECT * FROM Registro_medicamentos';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar registro' });
    res.json(results);
  });
});


//  RUTA 3: GUARDAR EN inventario
app.post('/inventario', (req, res) => {
  const { nombre, cantidad, consumo_por_dosis, id, actualizar } = req.body;

  const cantidadNum = parseInt(cantidad, 10);
  const consumoNum = parseInt(consumo_por_dosis || 0, 10);

  if (id) {
    // Modo actualizar stock existente
    if (isNaN(cantidadNum)) {
      return res.status(400).json({ mensaje: 'Cantidad debe ser un número válido' });
    }
    if (cantidadNum < 1) {
      return res.status(400).json({ mensaje: 'Cantidad debe ser mayor a 0' });
    }

    // Primero obtener la cantidad actual
    const sqlSelect = 'SELECT cantidad FROM inventario WHERE id = ?';
    db.query(sqlSelect, [id], (err, results) => {
      if (err) {
        //console.error('Error al obtener inventario:', err);
        return res.status(500).json({ mensaje: 'Error al obtener inventario' });
      }

      if (results.length === 0) {
        return res.status(404).json({ mensaje: 'Medicamento no encontrado' });
      }

      const nuevaCantidad = results[0].cantidad + cantidadNum;
      const sqlUpdate = 'UPDATE inventario SET cantidad = ? WHERE id = ?';
      db.query(sqlUpdate, [nuevaCantidad, id], (err, result) => {
        if (err) {
          //console.error('Error al actualizar inventario:', err);
          return res.status(500).json({ mensaje: 'Error al actualizar en la base de datos' });
        }
        res.json({ mensaje: 'Stock actualizado correctamente' });
      });
    });
  } else {
    // Modo agregar nuevo medicamento
    if (!nombre || isNaN(cantidadNum) || cantidadNum < 1 || isNaN(consumoNum) || consumoNum < 1) {
      return res.status(400).json({ mensaje: 'Campos incompletos' });
    }

    const sql = 'INSERT INTO inventario (nombre, cantidad, consumo_por_dosis) VALUES (?, ?, ?)';
    db.query(sql, [nombre, cantidadNum, consumoNum], (err, result) => {
      if (err) {
        //console.error('Error al guardar en inventario:', err);
        return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
      }
      res.json({ mensaje: 'Medicamento agregado al inventario correctamente' });
    });
  }
});

// Obtener todo el inventario
app.get('/inventario', (req, res) => {
  const sql = 'SELECT * FROM inventario';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar inventario' });
    res.json(results);
  });
});

const nodemailer = require("nodemailer");
const crypto = require("crypto");

let tokens = {}; // tokens de recuperación de contraseña
let authTokens = {}; // tokens de autenticación de sesión


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



// ============================================
// RUTAS DE FICHA MÉDICA
// ============================================

app.post('/guardarFichaMedica', (req, res) => {
  const { nombre, fechaNac, alergias, condiciones } = req.body;

  if (!nombre || !fechaNac) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sqlPaciente = 'INSERT INTO paciente (nombre_completo, fecha_nacimiento) VALUES (?, ?)';
  db.query(sqlPaciente, [nombre, fechaNac], (err, result) => {
    if (err) {
     // console.error('Error al guardar paciente:', err);
      return res.status(500).json({ mensaje: 'Error al guardar paciente' });
    }

    const idPaciente = result.insertId;

    if (alergias && alergias.length > 0) {
      const sqlAlergia = 'INSERT INTO alergia (id_paciente, nombre_alergia) VALUES ?';
      const valuesAlergias = alergias.map(a => [idPaciente, a]);
      db.query(sqlAlergia, [valuesAlergias], err => {
        if (err) console.error('Error al guardar alergias:', err);
      });
    }

    if (condiciones && condiciones.length > 0) {
      const sqlCondicion = 'INSERT INTO condicion_medica (id_paciente, nombre_condicion, nivel) VALUES ?';
      const valuesCondiciones = condiciones.map(c => [idPaciente, c.nombre, c.nivel]);
      db.query(sqlCondicion, [valuesCondiciones], err => {
        if (err) console.error('Error al guardar condiciones:', err);
      });
    }

    res.json({ mensaje: 'Ficha médica guardada correctamente en la base de datos' });
  });
});

// ============================================
// RUTAS DE CITAS MÉDICAS
// ============================================

app.post('/guardarCita', (req, res) => {
  const { id_paciente, fecha_hora, motivo, anticipacion_min } = req.body;

  if (!id_paciente || !fecha_hora || !motivo) {
    return res.status(400).json({ mensaje: 'Campos incompletos.' });
  }

  const sql = `INSERT INTO citas (id_paciente, fecha_hora, motivo, anticipacion_min) VALUES (?, ?, ?, ?)`;

  db.query(sql, [id_paciente, fecha_hora, motivo, anticipacion_min], (err, result) => {
    if (err) {
     // console.error('Error al guardar cita:', err);
      return res.status(500).json({ mensaje: 'Error al guardar la cita en la base de datos.' });
    }
    res.status(200).json({ mensaje: 'Cita registrada correctamente.' });
  });
});

app.get('/obtenerCitas', (req, res) => {
  const sql = 'SELECT * FROM citas ORDER BY fecha_hora ASC';
  
  db.query(sql, (err, results) => {
    if (err) {
      //console.error('Error al obtener citas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener las citas.' });
    }
    res.status(200).json(results);
  });
});

app.delete('/eliminarCita/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM citas WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar cita:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar la cita.' });
    }
    res.status(200).json({ mensaje: 'Cita eliminada correctamente.' });
  });
});

app.delete('/eliminarTodasCitas', (req, res) => {
  const sql = 'DELETE FROM citas';
  
  db.query(sql, (err, result) => {
    if (err) {
     // console.error('Error al eliminar todas las citas:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar las citas.' });
    }
    res.status(200).json({ mensaje: 'Todas las citas eliminadas correctamente.' });
  });
});

// ============================================
// RUTAS DE CHECKLIST
// ============================================

app.post('/guardarMedicamentosChecklist', (req, res) => {
  const { paciente_id, fecha, medicamentos } = req.body;

  if (!paciente_id || !fecha || !medicamentos) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const sqlDelete = 'DELETE FROM checklist_medicamentos WHERE paciente_id = ? AND fecha = ?';
  
  db.query(sqlDelete, [paciente_id, fecha], (err) => {
    if (err) {
     // console.error('Error al limpiar medicamentos:', err);
      return res.status(500).json({ mensaje: 'Error al procesar' });
    }

    if (medicamentos.length > 0) {
      const sqlInsert = 'INSERT INTO checklist_medicamentos (paciente_id, fecha, medicamento_id, medicamento_nombre, dosis, horario) VALUES ?';
      const values = medicamentos.map(m => [paciente_id, fecha, m.id, m.name, m.dose || '', m.schedule || '']);
      
      db.query(sqlInsert, [values], (err) => {
        if (err) {
       //   console.error('Error al guardar medicamentos:', err);
          return res.status(500).json({ mensaje: 'Error al guardar medicamentos' });
        }
        res.json({ mensaje: 'Medicamentos guardados correctamente' });
      });
    } else {
      res.json({ mensaje: 'Medicamentos actualizados' });
    }
  });
});

app.get('/obtenerChecklist/:paciente_id/:fecha', (req, res) => {
  const { paciente_id, fecha } = req.params;

  const sqlMeds = 'SELECT * FROM checklist_medicamentos WHERE paciente_id = ? AND fecha = ?';
  
  db.query(sqlMeds, [paciente_id, fecha], (err, meds) => {
    if (err) {
      //console.error('Error al obtener medicamentos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener datos' });
    }

    const sqlChecks = 'SELECT * FROM checklist_confirmaciones WHERE paciente_id = ? AND fecha = ?';
    
    db.query(sqlChecks, [paciente_id, fecha], (err, checks) => {
      if (err) {
       // console.error('Error al obtener confirmaciones:', err);
        return res.status(500).json({ mensaje: 'Error al obtener confirmaciones' });
      }

      const medsArray = meds.map(m => ({
        id: m.medicamento_id,
        name: m.medicamento_nombre,
        dose: m.dosis,
        schedule: m.horario
      }));

      const checksObj = {};
      checks.forEach(c => {
        checksObj[c.medicamento_id] = {
          taken: c.tomado,
          takenAt: c.hora_toma,
          actor: c.actor
        };
      });

      res.json({
        meds: medsArray,
        checks: checksObj
      });
    });
  });
});

app.post('/guardarChecklist', (req, res) => {
  const { paciente_id, fecha, medicamento_id, medicamento_nombre, tomado, hora_toma, actor } = req.body;

  if (!paciente_id || !fecha || !medicamento_id) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const sql = `
    INSERT INTO checklist_confirmaciones 
    (paciente_id, fecha, medicamento_id, medicamento_nombre, tomado, hora_toma, actor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    tomado = VALUES(tomado), 
    hora_toma = VALUES(hora_toma), 
    actor = VALUES(actor)
  `;

  db.query(sql, [paciente_id, fecha, medicamento_id, medicamento_nombre, tomado, hora_toma, actor], (err) => {
    if (err) {
     // console.error('Error al guardar confirmación:', err);
      return res.status(500).json({ mensaje: 'Error al guardar' });
    }
    res.json({ mensaje: 'Confirmación guardada' });
  });
});

app.delete('/eliminarChecklist/:paciente_id/:fecha/:medicamento_id', (req, res) => {
  const { paciente_id, fecha, medicamento_id } = req.params;

  const sql = 'DELETE FROM checklist_confirmaciones WHERE paciente_id = ? AND fecha = ? AND medicamento_id = ?';
  
  db.query(sql, [paciente_id, fecha, medicamento_id], (err) => {
    if (err) {
    //  console.error('Error al eliminar:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar' });
    }
    res.json({ mensaje: 'Confirmación eliminada' });
  });
});

app.delete('/limpiarDiaChecklist/:paciente_id/:fecha', (req, res) => {
  const { paciente_id, fecha } = req.params;

  const sql = 'DELETE FROM checklist_confirmaciones WHERE paciente_id = ? AND fecha = ?';
  
  db.query(sql, [paciente_id, fecha], (err) => {
    if (err) {
      //console.error('Error al limpiar día:', err);
      return res.status(500).json({ mensaje: 'Error al limpiar' });
    }
    res.json({ mensaje: 'Día limpiado correctamente' });
  });
});

// ============================================
// RUTAS DE PEDIDOS A FARMACIA
// ============================================

app.post('/guardarPedido', (req, res) => {
  const { id, farmacia, items, notas, estado, fecha_creacion, id_usuario } = req.body;

  //console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));

  if (!id || !farmacia || !items || items.length === 0) {
   // console.error('Datos incompletos');
    return res.status(400).json({ mensaje: 'Datos incompletos: falta id, farmacia o items' });
  }

  const itemsValidos = items.every(item => 
    item.nombre && 
    item.dosis && 
    item.cantidad > 0
  );

  if (!itemsValidos) {
    //console.error('Items con datos incompletos');
    return res.status(400).json({ mensaje: 'Todos los items deben tener nombre, dosis y cantidad' });
  }

  const sqlPedido = 'INSERT INTO pedidos_farmacia (id, farmacia, notas, estado, fecha_creacion, id_usuario) VALUES (?, ?, ?, ?, ?, ?)';
  
  db.query(sqlPedido, [id, farmacia, notas || null, estado || 'Pendiente', fecha_creacion, id_usuario || null], (err, result) => {
    if (err) {
      //console.error('Error al guardar pedido:', err);
      return res.status(500).json({ 
        mensaje: 'Error al guardar el pedido', 
        error: err.message 
      });
    }

  //  console.log('Pedido guardado, insertando items...');

    const sqlItems = 'INSERT INTO pedidos_items (pedido_id, nombre_medicamento, dosis, cantidad) VALUES ?';
    const values = items.map(item => [id, item.nombre, item.dosis, item.cantidad]);
    
    db.query(sqlItems, [values], (err) => {
      if (err) {
        //console.error('Error al guardar items:', err);
        db.query('DELETE FROM pedidos_farmacia WHERE id = ?', [id], () => {});
        return res.status(500).json({ 
          mensaje: 'Error al guardar items del pedido', 
          error: err.message 
        });
      }
     // console.log('Items guardados correctamente');
      res.json({ mensaje: 'Pedido guardado correctamente' });
    });
  });
});

app.get('/obtenerPedidos', (req, res) => {
  const sql = `
    SELECT 
      p.id, 
      p.farmacia, 
      p.estado, 
      p.fecha_creacion,
      COUNT(pi.id) as total_items
    FROM pedidos_farmacia p
    LEFT JOIN pedidos_items pi ON p.id = pi.pedido_id
    GROUP BY p.id
    ORDER BY p.fecha_creacion DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
    //  console.error('Error al obtener pedidos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
    res.json(results);
  });
});

app.get('/obtenerPedido/:id', (req, res) => {
  const { id } = req.params;

  const sqlPedido = 'SELECT * FROM pedidos_farmacia WHERE id = ?';
  
  db.query(sqlPedido, [id], (err, pedido) => {
    if (err) {
     // console.error('Error al obtener pedido:', err);
      return res.status(500).json({ mensaje: 'Error al obtener el pedido' });
    }

    if (pedido.length === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    const sqlItems = 'SELECT * FROM pedidos_items WHERE pedido_id = ?';
    
    db.query(sqlItems, [id], (err, items) => {
      if (err) {
        //console.error('Error al obtener items:', err);
        return res.status(500).json({ mensaje: 'Error al obtener items' });
      }

      res.json({
        pedido: pedido[0],
        items: items
      });
    });
  });
});

app.delete('/eliminarPedido/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM pedidos_farmacia WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
    //  console.error('Error al eliminar pedido:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar el pedido' });
    }
    res.json({ mensaje: 'Pedido eliminado correctamente' });
  });
});

app.delete('/eliminarTodosPedidos', (req, res) => {
  const sql = 'DELETE FROM pedidos_farmacia';
  
  db.query(sql, (err, result) => {
    if (err) {
     // console.error('Error al eliminar todos los pedidos:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar los pedidos' });
    }
    res.json({ mensaje: 'Todos los pedidos eliminados correctamente' });
  });
});

// ============================================
// RUTAS DE RECETAS MÉDICAS
// ============================================

app.post('/recetas', (req, res) => {
  const { id_usuario, nombre_medicamento, dosis, frecuencia } = req.body;

  if (!id_usuario || !nombre_medicamento || !dosis || !frecuencia) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = 'INSERT INTO recetas_medicas (id_usuario, nombre_medicamento, dosis, frecuencia, fecha_subida) VALUES (?, ?, ?, ?, NOW())';
  db.query(sql, [id_usuario, nombre_medicamento, dosis, frecuencia], (err, result) => {
    if (err) {
      console.error('Error al guardar receta:', err);
      return res.status(500).json({ mensaje: 'Error al guardar la receta' });
    }
    res.json({ mensaje: 'Receta guardada correctamente' });
  });
});

app.get('/recetas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = 'SELECT * FROM recetas_medicas WHERE id_usuario = ? ORDER BY fecha_subida DESC';
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar recetas:', err);
      return res.status(500).json({ mensaje: 'Error al cargar recetas' });
    }
    res.json(results);
  });
});

app.delete('/recetas/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM recetas_medicas WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar receta:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar la receta' });
    }
    res.json({ mensaje: 'Receta eliminada correctamente' });
  });
});

// ============================================
// RUTAS DE USUARIOS
// ============================================

app.get('/usuarios', (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar usuarios' });
    res.json(results);
  });
});

app.put('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, identidad, telefono, email, password, rol } = req.body;

  // Validación básica
  if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  // Verificar si el correo o identidad ya existen en otro usuario
  const verificarSql = "SELECT * FROM usuarios WHERE (email = ? OR identidad = ?) AND id != ?";
  db.query(verificarSql, [email, identidad, id], (err, resultados) => {
    if (err) {
      console.error('Error al verificar duplicados:', err);
      return res.status(500).json({ mensaje: 'Error al verificar datos duplicados' });
    }

    if (resultados.length > 0) {
      // Verificar cuál campo está duplicado
      const correoExiste = resultados.some((r) => r.email === email);
      const identidadExiste = resultados.some((r) => r.identidad === identidad);

      if (correoExiste && identidadExiste) {
        return res.status(400).json({ mensaje: 'El correo y la identidad ya están registrados en otro usuario' });
      } else if (correoExiste) {
        return res.status(400).json({ mensaje: 'El correo ya está registrado en otro usuario' });
      } else if (identidadExiste) {
        return res.status(400).json({ mensaje: 'La identidad ya está registrada en otro usuario' });
      }
    }

    // Si no hay duplicados, actualizar el usuario
    const sql = 'UPDATE usuarios SET nombres = ?, apellidos = ?, identidad = ?, telefono = ?, email = ?, password = ?, rol = ? WHERE id = ?';
    db.query(sql, [nombres, apellidos, identidad, telefono, email, password, rol, id], (err, result) => {
      if (err) {
        console.error('Error al actualizar usuario:', err);
        // Proporcionar mensaje más específico según el tipo de error
        if (err.code === 'ER_DUP_ENTRY') {
          if (err.message.includes('email')) {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' });
          } else if (err.message.includes('identidad')) {
            return res.status(400).json({ mensaje: 'La identidad ya está registrada' });
          }
          return res.status(400).json({ mensaje: 'Ya existe un registro con estos datos' });
        }
        return res.status(500).json({ mensaje: 'Error al actualizar usuario en la base de datos' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      res.json({ mensaje: 'Usuario actualizado correctamente' });
    });
  });
});

app.delete('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM usuarios WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ mensaje: 'Error al eliminar usuario' });
    res.json({ mensaje: 'Usuario eliminado' });
  });
});

// ============================================
// RUTAS DE TOMAS MEDICAS
// ============================================

app.post('/registrarTomaMedicamento', (req, res) => {
  const { id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma } = req.body;

  if (!id_usuario || !id_receta || !nombre_medicamento || !hora_toma || !fecha_toma) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = 'INSERT INTO tomas_medicas (id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma], (err, result) => {
    if (err) {
      console.error('Error al guardar toma:', err);
      return res.status(500).json({ mensaje: 'Error al guardar' });
    }
    res.json({ mensaje: 'Toma registrada', puntos_ganados: 10 });
  });
});

app.get('/tomasHoy/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = 'SELECT * FROM tomas_medicas WHERE id_usuario = ? AND fecha_toma = CURDATE() ORDER BY hora_toma';
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar tomas:', err);
      return res.status(500).json({ mensaje: 'Error al cargar' });
    }
    res.json(results);
  });
});

app.get('/tomas/:id_usuario/:fecha', (req, res) => {
  const { id_usuario, fecha } = req.params;
  
  console.log(`Consultando tomas - Usuario: ${id_usuario}, Fecha: ${fecha}`);

  // Usar rango de fechas para compatibilidad con DATETIME/TIMESTAMP
  const sql = 'SELECT * FROM tomas_medicas WHERE id_usuario = ? AND fecha_toma >= ? AND fecha_toma < DATE_ADD(?, INTERVAL 1 DAY) ORDER BY hora_toma';
  db.query(sql, [id_usuario, fecha, fecha], (err, results) => {
    if (err) {
      console.error('Error SQL al cargar tomas:', err);
      return res.status(500).json({ mensaje: 'Error al cargar', error: err.message, sql: sql });
    }
    console.log(`Tomas encontradas: ${results.length}`);
    res.json(results);
  });
});

// ============================================
// RUTAS DE HORARIOS PERSONALIZADOS DE MEDICAMENTOS
// ============================================

// Función auxiliar para parsear días de la semana (soporta JSON o texto separado por comas)
function parseDiasSemana(diasSemanaRaw) {
  if (!diasSemanaRaw) {
    return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  }
  
  // Si es un string que empieza con [, es JSON
  if (typeof diasSemanaRaw === 'string' && diasSemanaRaw.trim().startsWith('[')) {
    try {
      return JSON.parse(diasSemanaRaw);
    } catch (e) {
      console.warn('Error al parsear JSON de dias_semana:', e);
      return diasSemanaRaw.split(',').map(d => d.trim()).filter(d => d);
    }
  }
  
  // Si es string separado por comas
  if (typeof diasSemanaRaw === 'string') {
    return diasSemanaRaw.split(',').map(d => d.trim()).filter(d => d);
  }
  
  // Si ya es un array
  if (Array.isArray(diasSemanaRaw)) {
    return diasSemanaRaw;
  }
  
  return ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
}

// Obtener horarios de un medicamento específico

app.get('/horarios/:id_receta', (req, res) => {
  const { id_receta } = req.params;
  const { id_usuario } = req.query;

  if (!id_usuario) {
    return res.status(400).json({ mensaje: 'id_usuario es requerido' });
  }

  const sql = `
    SELECT h.*, c.notificaciones_activas, c.minutos_anticipacion, c.dias_semana, c.notas
    FROM horarios_medicamentos h
    LEFT JOIN configuracion_horarios c ON h.id_receta = c.id_receta AND h.id_usuario = c.id_usuario
    WHERE h.id_receta = ? AND h.id_usuario = ? AND h.activo = TRUE
    ORDER BY h.hora
  `;
  
  db.query(sql, [id_receta, id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar horarios:', err);
      return res.status(500).json({ mensaje: 'Error al cargar horarios', error: err.message });
    }
    
    // Si no hay configuración, devolver estructura vacía
    if (results.length === 0) {
      return res.json({
        horarios: [],
        configuracion: {
          notificaciones_activas: true,
          minutos_anticipacion: 15,
          dias_semana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
          notas: null
        }
      });
    }

    // Extraer configuración del primer resultado
    const configuracion = {
      notificaciones_activas: results[0].notificaciones_activas !== null ? results[0].notificaciones_activas : true,
      minutos_anticipacion: results[0].minutos_anticipacion || 15,
      dias_semana: parseDiasSemana(results[0].dias_semana),
      notas: results[0].notas
    };


    // Limpiar campos de configuración de los horarios
    const horarios = results.map(h => ({
      id: h.id,
      id_receta: h.id_receta,
      id_usuario: h.id_usuario,
      hora: h.hora,
      activo: h.activo,
      created_at: h.created_at
    }));

    res.json({
      horarios: horarios,
      configuracion: configuracion
    });
  });
});

// Guardar nuevos horarios para un medicamento
app.post('/horarios', (req, res) => {
  const { id_receta, id_usuario, horarios, configuracion } = req.body;

  console.log('=== POST /horarios ===');
  console.log('Body recibido:', JSON.stringify(req.body, null, 2));

  if (!id_receta || !id_usuario || !horarios || !Array.isArray(horarios)) {
    console.log('Error: Datos incompletos', { id_receta, id_usuario, horarios });
    return res.status(400).json({ mensaje: 'Datos incompletos. Se requiere id_receta, id_usuario y horarios (array)' });
  }

  // Validar que los horarios no estén vacíos
  if (horarios.length === 0) {
    console.log('Error: Horarios vacíos');
    return res.status(400).json({ mensaje: 'Debe proporcionar al menos un horario' });
  }

  // Validar formato de horarios
  for (const hora of horarios) {
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(hora)) {
      console.log('Error: Formato de hora inválido:', hora);
      return res.status(400).json({ mensaje: `Formato de hora inválido: ${hora}. Use HH:MM o HH:MM:SS` });
    }
  }

  console.log('Validaciones pasadas. Iniciando transacción...');

  // Iniciar transacción
  db.beginTransaction(err => {
    if (err) {
      console.error('Error al iniciar transacción:', err);
      return res.status(500).json({ mensaje: 'Error al iniciar transacción', error: err.message });
    }

    console.log('Transacción iniciada. Desactivando horarios existentes...');

    // 1. Desactivar horarios existentes
    const sqlDesactivar = 'UPDATE horarios_medicamentos SET activo = FALSE WHERE id_receta = ? AND id_usuario = ?';
    console.log('Ejecutando SQL desactivar:', sqlDesactivar);
    console.log('Valores:', [id_receta, id_usuario]);
    db.query(sqlDesactivar, [id_receta, id_usuario], (err, result) => {
      if (err) {
        console.error('Error al desactivar horarios:', err);
        console.error('SQL:', sqlDesactivar);
        console.error('Valores:', [id_receta, id_usuario]);
        return db.rollback(() => {
          res.status(500).json({ mensaje: 'Error al desactivar horarios anteriores', error: err.message, sql: sqlDesactivar });
        });
      }
      console.log('Horarios desactivados:', result.affectedRows);


      console.log('Horarios desactivados. Insertando nuevos horarios...');

      // 2. Insertar nuevos horarios
      const sqlInsertar = 'INSERT INTO horarios_medicamentos (id_receta, id_usuario, hora, activo) VALUES ?';
      const valores = horarios.map(hora => [id_receta, id_usuario, hora, true]);
      
      console.log('Valores a insertar:', valores);

      db.query(sqlInsertar, [valores], (err, result) => {
        if (err) {
          console.error('Error al insertar horarios:', err);
          return db.rollback(() => {
            res.status(500).json({ mensaje: 'Error al guardar horarios', error: err.message });
          });
        }

        console.log('Horarios insertados:', result.affectedRows);

        // 3. Guardar configuración
        const sqlConfig = `
          INSERT INTO configuracion_horarios 
          (id_usuario, id_receta, notificaciones_activas, minutos_anticipacion, dias_semana, notas) 
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          notificaciones_activas = VALUES(notificaciones_activas),
          minutos_anticipacion = VALUES(minutos_anticipacion),
          dias_semana = VALUES(dias_semana),
          notas = VALUES(notas),
          updated_at = CURRENT_TIMESTAMP
        `;
        
        const diasSemana = configuracion?.dias_semana ? JSON.stringify(configuracion.dias_semana) : JSON.stringify(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']);
        
        console.log('Guardando configuración:', {
          id_usuario,
          id_receta,
          notificaciones_activas: configuracion?.notificaciones_activas !== false,
          minutos_anticipacion: configuracion?.minutos_anticipacion || 15,
          dias_semana: diasSemana,
          notas: configuracion?.notas || null
        });

        db.query(sqlConfig, [
          id_usuario, 
          id_receta, 
          configuracion?.notificaciones_activas !== false,
          configuracion?.minutos_anticipacion || 15,
          diasSemana,
          configuracion?.notas || null
        ], (err) => {
          if (err) {
            console.error('Error al guardar configuración:', err);
            return db.rollback(() => {
              res.status(500).json({ mensaje: 'Error al guardar configuración', error: err.message });
            });
          }

          console.log('Configuración guardada. Confirmando transacción...');

          // Confirmar transacción
          db.commit(err => {
            if (err) {
              console.error('Error al confirmar transacción:', err);
              return db.rollback(() => {
                res.status(500).json({ mensaje: 'Error al confirmar transacción', error: err.message });
              });
            }

            console.log('=== Transacción completada exitosamente ===');

            res.json({ 
              mensaje: 'Horarios guardados correctamente',
              horarios_guardados: horarios.length,
              id_receta: id_receta
            });
          });
        });
      });
    });
  });
});


// Actualizar un horario específico
app.put('/horarios/:id', (req, res) => {
  const { id } = req.params;
  const { hora, activo } = req.body;

  if (!hora && activo === undefined) {
    return res.status(400).json({ mensaje: 'Debe proporcionar al menos un campo para actualizar (hora o activo)' });
  }

  const campos = [];
  const valores = [];

  if (hora) {
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(hora)) {
      return res.status(400).json({ mensaje: 'Formato de hora inválido. Use HH:MM o HH:MM:SS' });
    }
    campos.push('hora = ?');
    valores.push(hora);
  }

  if (activo !== undefined) {
    campos.push('activo = ?');
    valores.push(activo);
  }

  valores.push(id);

  const sql = `UPDATE horarios_medicamentos SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  
  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Error al actualizar horario:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar horario', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    res.json({ mensaje: 'Horario actualizado correctamente' });
  });
});

// Eliminar un horario específico
app.delete('/horarios/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM horarios_medicamentos WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar horario:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar horario', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Horario no encontrado' });
    }

    res.json({ mensaje: 'Horario eliminado correctamente' });
  });
});

// Validar conflictos entre horarios de medicamentos
app.post('/validar-conflictos', (req, res) => {
  const { id_usuario, horarios_propuestos, id_receta_excluir } = req.body;

  if (!id_usuario || !horarios_propuestos || !Array.isArray(horarios_propuestos)) {
    return res.status(400).json({ mensaje: 'Datos incompletos. Se requiere id_usuario y horarios_propuestos' });
  }

  // Obtener todos los horarios activos del usuario, excluyendo la receta actual si se está editando
  let sql = `
    SELECT h.id, h.id_receta, h.hora, r.nombre_medicamento
    FROM horarios_medicamentos h
    JOIN recetas_medicas r ON h.id_receta = r.id
    WHERE h.id_usuario = ? AND h.activo = TRUE
  `;
  
  const params = [id_usuario];
  
  if (id_receta_excluir) {
    sql += ' AND h.id_receta != ?';
    params.push(id_receta_excluir);
  }

  db.query(sql, params, (err, horariosExistentes) => {
    if (err) {
      console.error('Error al validar conflictos:', err);
      return res.status(500).json({ mensaje: 'Error al validar conflictos', error: err.message });
    }

    const conflictos = [];
    const margenMinutos = 30; // Margen mínimo entre medicamentos

    for (const propuesto of horarios_propuestos) {
      const horaPropuesta = new Date(`2000-01-01T${propuesto}`);
      const horaPropuestaMinutos = horaPropuesta.getHours() * 60 + horaPropuesta.getMinutes();

      for (const existente of horariosExistentes) {
        const horaExistente = new Date(`2000-01-01T${existente.hora}`);
        const horaExistenteMinutos = horaExistente.getHours() * 60 + horaExistente.getMinutes();

        const diferencia = Math.abs(horaPropuestaMinutos - horaExistenteMinutos);
        
        // Detectar conflicto si la diferencia es menor al margen
        if (diferencia < margenMinutos) {
          conflictos.push({
            hora_propuesta: propuesto,
            hora_existente: existente.hora,
            medicamento_existente: existente.nombre_medicamento,
            id_receta_existente: existente.id_receta,
            diferencia_minutos: diferencia,
            tipo: diferencia === 0 ? 'mismo_horario' : 'muy_cercano'
          });
        }
      }
    }

    res.json({
      tiene_conflictos: conflictos.length > 0,
      conflictos: conflictos,
      margen_minutos: margenMinutos,
      total_horarios_existentes: horariosExistentes.length
    });
  });
});

// Obtener todos los horarios de un usuario (para notificaciones)
app.get('/horarios-usuario/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT 
      h.id,
      h.id_receta,
      h.hora,
      r.nombre_medicamento,
      r.dosis,
      c.notificaciones_activas,
      c.minutos_anticipacion,
      c.dias_semana
    FROM horarios_medicamentos h
    JOIN recetas_medicas r ON h.id_receta = r.id
    LEFT JOIN configuracion_horarios c ON h.id_receta = c.id_receta AND h.id_usuario = c.id_usuario
    WHERE h.id_usuario = ? AND h.activo = TRUE
    ORDER BY h.hora
  `;
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar horarios del usuario:', err);
      return res.status(500).json({ mensaje: 'Error al cargar horarios', error: err.message });
    }

    // Procesar resultados para incluir días de la semana como array
    const horariosProcesados = results.map(h => ({
      ...h,
      dias_semana: parseDiasSemana(h.dias_semana)
    }));


    res.json(horariosProcesados);
  });
});





// ============================================
// RUTAS DE USUARIOS POR ROL
// ============================================

app.get('/usuarios/rol/:rol', (req, res) => {
  const { rol } = req.params;
  const sql = 'SELECT id, nombres, apellidos FROM usuarios WHERE rol = ?';
  db.query(sql, [rol], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar usuarios' });
    res.json(results);
  });
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando correctamente' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
  console.log('CORS habilitado para todas las solicitudes');
});
