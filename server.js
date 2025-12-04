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
  const { nombre, dosis, frecuencia, hora, paciente_id  } = req.body;

  if (!nombre || !dosis || !frecuencia || !hora || !paciente_id) {
    return res.status(400).json({ mensaje: ' Campos incompletos' });
  }

  const sql = 'INSERT INTO medicamentos (nombre, dosis, frecuencia, hora,paciente_id) VALUES (?, ?, ?, ?,?)';
  db.query(sql, [nombre, dosis, frecuencia, hora, paciente_id], (err, result) => {
    if (err) {
      //console.error(' Error al guardar en Registro_medicamentos:', err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos' });
    }
    res.json({ mensaje: ' Medicamento registrado correctamente a paciente' });
  });
});



//==========================================================
//solicitar pacientes para el combo
// Endpoint que enviará los datos del ComboBox
//?
app.get("/pacientes_usuario", (req, res) => {
 const id_usuario = req.query.id_usuario;
  if (!id_usuario) return res.status(400).json({ mensaje: "Falta id_usuario" });

    const sql = `SELECT   
    p.id_paciente,
    p.nombre_completo
FROM paciente p
INNER JOIN usuarios u ON p.usuario_id = u.id
WHERE u.id = ?`;

    db.query(sql, [id_usuario], (err, results) => {
        if (err) {
            res.status(500).json({ error: "Error consultando la base" });
            return;
        }
        res.json(results); // Envía JSON al frontend
    });
});


//==========================================================
// carga de lista de  medicamentos
//==========================================================
app.get("/medicamentos_paciente", (req, res) => {
  const id_paciente = req.query.id_paciente;
 if (!id_paciente) return res.status(400).json({ mensaje: "Falta id_paciente" });

  const sql = `
     SELECT nombre, dosis, frecuencia, hora
    FROM medicamentos
    WHERE paciente_id = ?
  `;  

   db.query(sql, [id_paciente], (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: "Error en la BD" });

    res.json(resultados);
  });
});


//==========================================================

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

// codigo de itream puesto por robertson

// ============================================
// RUTAS DE RECETAS MÉDICAS
// ============================================

app.post('/recetas', (req, res) => {
  const { id_usuario, nombre_medicamento, dosis, frecuencia, archivo_url } = req.body;

  if (!id_usuario || !nombre_medicamento || !dosis || !frecuencia) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = 'INSERT INTO recetas_medicas (id_usuario, nombre_medicamento, dosis, frecuencia, archivo_url) VALUES (?, ?, ?, ?, ?)';
  
  db.query(sql, [id_usuario, nombre_medicamento, dosis, frecuencia, archivo_url || null], (err, result) => {
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
      console.error('Error al obtener recetas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener recetas' });
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
      return res.status(500).json({ mensaje: 'Error al eliminar' });
    }
    res.json({ mensaje: 'Receta eliminada correctamente' });
  });
});
// ============================================
// RUTAS DE RECOMPENSAS Y PUNTOS
// ============================================

app.get('/recompensas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = 'SELECT * FROM recompensas WHERE id_usuario = ?';
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener recompensas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener recompensas' });
    }
    
    if (results.length === 0) {
      const sqlInsert = 'INSERT INTO recompensas (id_usuario, puntos_totales, medallas, nivel, porcentaje_cumplimiento, racha_dias) VALUES (?, 0, 0, 1, 0, 0)';
      
      db.query(sqlInsert, [id_usuario], (err, result) => {
        if (err) {
          console.error('Error al crear recompensas:', err);
          return res.status(500).json({ mensaje: 'Error al crear recompensas' });
        }
        res.json({ 
          id_usuario, 
          puntos_totales: 0, 
          medallas: 0, 
          nivel: 1, 
          porcentaje_cumplimiento: 0, 
          racha_dias: 0 
        });
      });
    } else {
      res.json(results[0]);
    }
  });
});

app.post('/registrarCumplimiento', (req, res) => {
  const { id_usuario } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ mensaje: 'ID de usuario requerido' });
  }

  const sqlUpdate = `
    UPDATE recompensas 
    SET puntos_totales = puntos_totales + 10,
        racha_dias = racha_dias + 1,
        porcentaje_cumplimiento = LEAST(100, porcentaje_cumplimiento + 1)
    WHERE id_usuario = ?
  `;
  
  db.query(sqlUpdate, [id_usuario], (err, result) => {
    if (err) {
      console.error('Error al actualizar recompensas:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar' });
    }

    const sqlLogro = `
      INSERT INTO logros (id_usuario, tipo_logro, descripcion, puntos_ganados) 
      VALUES (?, 'cumplimiento', 'Tomaste tu medicamento a tiempo', 10)
    `;
    
    db.query(sqlLogro, [id_usuario], (err) => {
      if (err) console.error('Error al guardar logro:', err);
    });

    const sqlCheck = 'SELECT racha_dias FROM recompensas WHERE id_usuario = ?';
    
    db.query(sqlCheck, [id_usuario], (err, results) => {
      if (err || results.length === 0) return res.json({ mensaje: 'Cumplimiento registrado' });

      const racha = results[0].racha_dias;

      if (racha === 7 || racha === 30) {
        const nombreMedalla = racha === 7 ? 'Semana Perfecta' : 'Racha de 30';
        const descripcion = racha === 7 ? '7 días consecutivos' : '30 días seguidos';
        
        const sqlMedalla = `
          INSERT INTO medallas_usuario (id_usuario, nombre_medalla, descripcion, icono) 
          VALUES (?, ?, ?, ?)
        `;
        
        db.query(sqlMedalla, [id_usuario, nombreMedalla, descripcion, 'trophy'], (err) => {
          if (err) console.error('Error al dar medalla:', err);
        });

        const sqlUpdateMedallas = 'UPDATE recompensas SET medallas = medallas + 1 WHERE id_usuario = ?';
        db.query(sqlUpdateMedallas, [id_usuario], (err) => {
          if (err) console.error('Error al actualizar medallas:', err);
        });

        const sqlLogroMedalla = `
          INSERT INTO logros (id_usuario, tipo_logro, descripcion, puntos_ganados) 
          VALUES (?, 'medalla', 'Obtuviste la medalla: ${nombreMedalla}', 50)
        `;
        
        db.query(sqlLogroMedalla, [id_usuario], (err) => {
          if (err) console.error('Error al registrar logro medalla:', err);
        });
      }

      res.json({ mensaje: 'Cumplimiento registrado correctamente' });
    });
  });
});

app.get('/logros/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = 'SELECT * FROM logros WHERE id_usuario = ? ORDER BY fecha_obtenido DESC LIMIT 10';
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener logros:', err);
      return res.status(500).json({ mensaje: 'Error al obtener logros' });
    }
    res.json(results);
  });
});

app.get('/medallas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = 'SELECT * FROM medallas_usuario WHERE id_usuario = ? ORDER BY fecha_obtenida DESC';
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener medallas:', err);
      return res.status(500).json({ mensaje: 'Error al obtener medallas' });
    }
    res.json(results);
  });
});

// ============================================
// RUTAS DE EMERGENCIAS
// ============================================

app.post('/activarEmergencia', (req, res) => {
  const { id_usuario, tipo_activacion, ubicacion_lat, ubicacion_lng, notas } = req.body;

  if (!id_usuario || !tipo_activacion) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const sql = `
    INSERT INTO historial_emergencias 
    (id_usuario, tipo_activacion, ubicacion_lat, ubicacion_lng, notas, estado) 
    VALUES (?, ?, ?, ?, ?, 'activa')
  `;
  
  db.query(sql, [id_usuario, tipo_activacion, ubicacion_lat || null, ubicacion_lng || null, notas || null], (err, result) => {
    if (err) {
      console.error('Error al registrar emergencia:', err);
      return res.status(500).json({ mensaje: 'Error al registrar emergencia' });
    }

    const sqlContactos = 'SELECT * FROM contactos_emergencia WHERE id_usuario = ? ORDER BY prioridad ASC';
    
    db.query(sqlContactos, [id_usuario], (err, contactos) => {
      if (err) {
        console.error('Error al obtener contactos:', err);
      } else {
        console.log('Notificar a contactos:', contactos);
      }
    });

    res.json({ 
      mensaje: 'Emergencia activada correctamente',
      emergencia_id: result.insertId
    });
  });
});

app.put('/cancelarEmergencia/:id', (req, res) => {
  const { id } = req.params;
  const { estado, notas } = req.body;

  if (!estado) {
    return res.status(400).json({ mensaje: 'Estado requerido' });
  }

  const sql = `
    UPDATE historial_emergencias 
    SET estado = ?, notas = ?
    WHERE id = ?
  `;
  
  db.query(sql, [estado, notas || null, id], (err, result) => {
    if (err) {
      console.error('Error al cancelar emergencia:', err);
      return res.status(500).json({ mensaje: 'Error al cancelar emergencia' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Emergencia no encontrada' });
    }
    
    res.json({ mensaje: 'Emergencia cancelada correctamente' });
  });
});

app.get('/contactosEmergencia/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = 'SELECT * FROM contactos_emergencia WHERE id_usuario = ? ORDER BY prioridad ASC';
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener contactos:', err);
      return res.status(500).json({ mensaje: 'Error al obtener contactos' });
    }
    res.json(results);
  });
});

app.post('/contactosEmergencia', (req, res) => {
  const { id_usuario, nombre_contacto, relacion, telefono, tipo, prioridad } = req.body;

  if (!id_usuario || !nombre_contacto || !telefono) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const sql = `
    INSERT INTO contactos_emergencia 
    (id_usuario, nombre_contacto, relacion, telefono, tipo, prioridad) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [id_usuario, nombre_contacto, relacion || null, telefono, tipo || 'familiar', prioridad || 1], (err, result) => {
    if (err) {
      console.error('Error al guardar contacto:', err);
      return res.status(500).json({ mensaje: 'Error al guardar contacto' });
    }
    res.json({ mensaje: 'Contacto guardado correctamente' });
  });
});

app.delete('/contactosEmergencia/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'DELETE FROM contactos_emergencia WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar contacto:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar' });
    }
    res.json({ mensaje: 'Contacto eliminado correctamente' });
  });
});

app.get('/historialEmergencias/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = 'SELECT * FROM historial_emergencias WHERE id_usuario = ? ORDER BY fecha_hora DESC';
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ mensaje: 'Error al obtener historial' });
    }
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
// ============================================
// AGREGAR ESTAS RUTAS AL SERVER.JS EXISTENTE
// ============================================

// RUTA: Registrar que el paciente tomó un medicamento
// ============================================
// REEMPLAZAR ESTA RUTA EN TU SERVER.JS
// Busca la ruta /registrarTomaMedicamento y reemplazala
// ============================================

// ============================================
// REEMPLAZAR ESTA RUTA EN TU SERVER.JS
// Busca la ruta /registrarTomaMedicamento y reemplazala
// ============================================

app.post('/registrarTomaMedicamento', (req, res) => {
  const { id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma } = req.body;

  console.log('Datos recibidos en registrarTomaMedicamento:', req.body);

  if (!id_usuario || !id_receta || !nombre_medicamento) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const horaActual = hora_toma || new Date().toTimeString().slice(0, 8);
  const fechaActual = fecha_toma || new Date().toISOString().slice(0, 10);

  // Primero verificar si la tabla existe, si no, crearla
  const sqlCreateTable = `
    CREATE TABLE IF NOT EXISTS confirmaciones_toma (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      id_receta INT NOT NULL,
      nombre_medicamento VARCHAR(255) NOT NULL,
      hora_toma TIME NOT NULL,
      fecha_toma DATE NOT NULL,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_usuario (id_usuario),
      INDEX idx_fecha (fecha_toma)
    )
  `;

  db.query(sqlCreateTable, (err) => {
    if (err) {
      console.error('Error al crear/verificar tabla:', err);
    }

    // Ahora insertar el registro
    const sql = `
      INSERT INTO confirmaciones_toma 
      (id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [id_usuario, id_receta, nombre_medicamento, horaActual, fechaActual], (err, result) => {
      if (err) {
        console.error('Error al registrar toma:', err);
        return res.status(500).json({ mensaje: 'Error al registrar', error: err.message });
      }

      console.log('Toma registrada exitosamente:', result);

      // Verificar si existe la tabla recompensas
      const sqlCheckRecompensas = `
        SELECT * FROM recompensas WHERE id_usuario = ?
      `;

      db.query(sqlCheckRecompensas, [id_usuario], (err, recompensas) => {
        if (err) {
          console.error('Error al verificar recompensas:', err);
          return res.json({ 
            mensaje: 'Toma registrada correctamente',
            puntos_ganados: 10
          });
        }

        // Si no existe registro de recompensas, crearlo
        if (recompensas.length === 0) {
          const sqlCreateRecompensa = `
            INSERT INTO recompensas (id_usuario, puntos_totales, medallas, nivel, porcentaje_cumplimiento, racha_dias) 
            VALUES (?, 10, 0, 1, 5, 1)
          `;
          
          db.query(sqlCreateRecompensa, [id_usuario], (err) => {
            if (err) console.error('Error al crear recompensas:', err);
          });
        } else {
          // Actualizar puntos de recompensa
          const sqlPuntos = `
            UPDATE recompensas 
            SET puntos_totales = puntos_totales + 10,
                racha_dias = racha_dias + 1,
                porcentaje_cumplimiento = LEAST(100, porcentaje_cumplimiento + 5)
            WHERE id_usuario = ?
          `;
          
          db.query(sqlPuntos, [id_usuario], (err) => {
            if (err) console.error('Error al actualizar puntos:', err);
          });
        }

        // Registrar logro
        const sqlLogro = `
          INSERT INTO logros (id_usuario, tipo_logro, descripcion, puntos_ganados) 
          VALUES (?, 'medicamento_tomado', ?, 10)
        `;
        
        db.query(sqlLogro, [id_usuario, `Tomaste ${nombre_medicamento}`], (err) => {
          if (err) console.error('Error al guardar logro:', err);
        });

        res.json({ 
          mensaje: 'Toma registrada correctamente',
          puntos_ganados: 10
        });
      });
    });
  });
});
// RUTA: Obtener historial de tomas del paciente
app.get('/historialTomas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const sql = `
    SELECT * FROM confirmaciones_toma 
    WHERE id_usuario = ? 
    ORDER BY fecha_toma DESC, hora_toma DESC 
    LIMIT 50
  `;
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ mensaje: 'Error al obtener historial' });
    }
    res.json(results);
  });
});

// RUTA: Obtener tomas de hoy
app.get('/tomasHoy/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  
  const fechaHoy = new Date().toISOString().slice(0, 10);
  
  const sql = `
    SELECT * FROM confirmaciones_toma 
    WHERE id_usuario = ? AND fecha_toma = ?
    ORDER BY hora_toma DESC
  `;
  
  db.query(sql, [id_usuario, fechaHoy], (err, results) => {
    if (err) {
      console.error('Error al obtener tomas de hoy:', err);
      return res.status(500).json({ mensaje: 'Error al obtener tomas' });
    }
    res.json(results);
  });
});

// RUTA: Actualizar estado de pedido (para WhatsApp)
app.put('/actualizarEstadoPedido/:id', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ mensaje: 'Estado requerido' });
  }

  const sql = 'UPDATE pedidos_farmacia SET estado = ? WHERE id = ?';
  
  db.query(sql, [estado, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar estado:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }
    
    res.json({ mensaje: 'Estado actualizado correctamente' });
  });
});