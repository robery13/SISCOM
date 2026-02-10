require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname)));

// Ruta raíz: servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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




// (Nota) El servidor se inicia al final del archivo.

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

// HU-32: Eliminación segura de medicamento del checklist
// Tareas: 1) Obtener info del med, 2) Eliminar confirmaciones asociadas,
// 3) Eliminar medicamento del checklist, 4) Devolver unidad al inventario
app.delete('/eliminarMedicamentoChecklist/:paciente_id/:fecha/:medicamento_id', (req, res) => {
  const { paciente_id, fecha, medicamento_id } = req.params;

  // 1. Obtener info del medicamento antes de eliminarlo (para inventario)
  const sqlInfo = 'SELECT medicamento_nombre, dosis FROM checklist_medicamentos WHERE paciente_id = ? AND fecha = ? AND medicamento_id = ?';
  db.query(sqlInfo, [paciente_id, fecha, medicamento_id], (err, infoRows) => {
    if (err) return res.status(500).json({ mensaje: 'Error al buscar medicamento' });

    const medNombre = infoRows.length > 0 ? infoRows[0].medicamento_nombre : null;

    // 2. Eliminar confirmaciones asociadas
    const sqlConf = 'DELETE FROM checklist_confirmaciones WHERE paciente_id = ? AND fecha = ? AND medicamento_id = ?';
    db.query(sqlConf, [paciente_id, fecha, medicamento_id], (err2) => {
      if (err2) return res.status(500).json({ mensaje: 'Error al eliminar confirmaciones' });

      // 3. Eliminar el medicamento del checklist
      const sqlMed = 'DELETE FROM checklist_medicamentos WHERE paciente_id = ? AND fecha = ? AND medicamento_id = ?';
      db.query(sqlMed, [paciente_id, fecha, medicamento_id], (err3, result) => {
        if (err3) return res.status(500).json({ mensaje: 'Error al eliminar medicamento' });

        // 4. Actualizar inventario (devolver 1 unidad si existe)
        if (medNombre) {
          const sqlInv = 'UPDATE inventario SET cantidad = cantidad + 1 WHERE nombre LIKE ? LIMIT 1';
          db.query(sqlInv, [`%${medNombre.split(' ')[0]}%`], (err4) => {
            if (err4) console.error('Aviso: no se pudo actualizar inventario:', err4.message);
            res.json({
              mensaje: 'Medicamento eliminado correctamente',
              eliminados: result.affectedRows,
              inventario_actualizado: !err4
            });
          });
        } else {
          res.json({ mensaje: 'Medicamento eliminado', eliminados: result.affectedRows, inventario_actualizado: false });
        }
      });
    });
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
// RUTAS PANEL CUIDADOR - PACIENTES + ALERTAS (HU-26)
// Funciones: Listar pacientes por cuidador, filtrar alertas
// ============================================

// Nota: Se asume que paciente.usuario_id representa el cuidador (empleado) asignado.
// Si tu modelo cambia, aquí es donde se ajusta la lógica de asignación.

// HU-26: Obtener pacientes asignados a un cuidador con estatus de salud calculado
// Se calcula el estatus según el nivel máximo de condiciones médicas
app.get('/cuidador/:cuidadorId/pacientes', (req, res) => {
  const { cuidadorId } = req.params;

  const sql = `
    SELECT
      p.id_paciente,
      p.nombre_completo,
      p.fecha_nacimiento,
      p.fecha_registro,
      p.usuario_id,
      CASE
        WHEN MAX(CASE c.nivel WHEN 'Crítica' THEN 3 WHEN 'Moderada' THEN 2 WHEN 'Leve' THEN 1 ELSE 0 END) = 3 THEN 'critico'
        WHEN MAX(CASE c.nivel WHEN 'Crítica' THEN 3 WHEN 'Moderada' THEN 2 WHEN 'Leve' THEN 1 ELSE 0 END) = 2 THEN 'importante'
        WHEN MAX(CASE c.nivel WHEN 'Crítica' THEN 3 WHEN 'Moderada' THEN 2 WHEN 'Leve' THEN 1 ELSE 0 END) = 1 THEN 'normal'
        ELSE 'leve'
      END AS estatus_salud
    FROM paciente p
    LEFT JOIN condicion_medica c ON c.id_paciente = p.id_paciente
    WHERE p.usuario_id = ?
    GROUP BY p.id_paciente
    ORDER BY p.nombre_completo ASC
  `;

  db.query(sql, [cuidadorId], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cargar pacientes' });
    }
    res.json(results);
  });
});

// HU-26: Obtener alertas de pacientes del cuidador con filtros (estado, desde, hasta)
// Filtros (opcionales) por querystring:
// - estado: 'pendiente' | 'atendida' | 'todas'
// - desde / hasta: datetime (YYYY-MM-DDTHH:mm) o formato MySQL compatible
app.get('/cuidador/:cuidadorId/alertas', (req, res) => {
  const { cuidadorId } = req.params;
  const { estado, desde, hasta } = req.query;

  let sql = `
    SELECT
      a.id_alerta,
      a.paciente_id,
      a.descripcion,
      a.estado,
      a.creado_en
    FROM alertas_paciente a
    JOIN paciente p ON p.id_paciente = a.paciente_id
    WHERE p.usuario_id = ?
  `;
  const params = [cuidadorId];

  if (estado && estado !== 'todas') {
    sql += ' AND a.estado = ?';
    params.push(estado);
  }

  if (desde) {
    sql += ' AND a.creado_en >= ?';
    params.push(desde);
  }

  if (hasta) {
    sql += ' AND a.creado_en <= ?';
    params.push(hasta);
  }

  sql += ' ORDER BY a.creado_en DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        return res.status(200).json({
          ok: false,
          needsSetup: true,
          mensaje: 'Falta la tabla alertas_paciente en la base de datos. Debes crearla para usar el panel de alertas.'
        });
      }
      return res.status(500).json({ mensaje: 'Error al cargar alertas' });
    }
    res.json({ ok: true, alertas: results });
  });
});

// ============================================
// RUTAS DE ESTADÍSTICAS DE SALUD POR PACIENTE (HU-27)
// Funciones: Estadísticas individuales, comparación entre pacientes
// ============================================

// HU-27: Estadísticas individuales de un paciente
// Consulta: info básica, condiciones, alergias, medicamentos, citas, cumplimiento checklist
app.get('/estadisticas/paciente/:id', (req, res) => {
  const { id } = req.params;

  const queries = {
    // Info básica del paciente
    paciente: 'SELECT * FROM paciente WHERE id_paciente = ?',
    // Condiciones médicas
    condiciones: 'SELECT nombre_condicion, nivel FROM condicion_medica WHERE id_paciente = ?',
    // Alergias
    alergias: 'SELECT nombre_alergia FROM alergia WHERE id_paciente = ?',
    // Medicamentos asignados
    medicamentos: 'SELECT nombre, dosis, frecuencia, hora FROM medicamentos WHERE paciente_id = ?',
    // Citas y su estado
    citas: 'SELECT estado, COUNT(*) as total FROM citas WHERE id_paciente = ? GROUP BY estado',
    // Total citas
    totalCitas: 'SELECT COUNT(*) as total FROM citas WHERE id_paciente = ?',
    // Checklist: medicamentos programados (usar LIKE para id del paciente)
    checklistTotal: `SELECT COUNT(*) as total FROM checklist_medicamentos WHERE paciente_id LIKE CONCAT(?, ' - %')`,
    // Checklist: confirmaciones tomadas
    checklistTomados: `SELECT COUNT(*) as total FROM checklist_confirmaciones WHERE paciente_id LIKE CONCAT(?, ' - %') AND tomado = 1`
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.query(sql, [id], (err, rows) => {
      if (err) {
        results[key] = [];
      } else {
        results[key] = rows;
      }
      completed++;
      if (completed === totalQueries) {
        // Calcular porcentaje de cumplimiento
        const totalChecklist = results.checklistTotal[0]?.total || 0;
        const tomados = results.checklistTomados[0]?.total || 0;
        const cumplimiento = totalChecklist > 0 ? Math.round((tomados / totalChecklist) * 100) : 0;

        // Estructura de respuesta
        const estadisticas = {
          paciente: results.paciente[0] || null,
          condiciones: results.condiciones,
          alergias: results.alergias,
          medicamentos: results.medicamentos,
          citas: {
            detalle: results.citas,
            total: results.totalCitas[0]?.total || 0
          },
          cumplimiento: {
            total_programados: totalChecklist,
            total_tomados: tomados,
            porcentaje: cumplimiento
          }
        };

        res.json(estadisticas);
      }
    });
  });
});

// HU-27: Comparar estadísticas entre múltiples pacientes (JOIN paciente, medicamentos, condiciones, alergias, citas)
app.get('/estadisticas/comparar', (req, res) => {
  const { ids } = req.query; // ids separados por coma: "1,2,3"

  if (!ids) {
    return res.status(400).json({ mensaje: 'Debe proporcionar ids de pacientes (ej. ?ids=1,2,3)' });
  }

  const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

  if (idArray.length === 0) {
    return res.status(400).json({ mensaje: 'IDs inválidos' });
  }

  const placeholders = idArray.map(() => '?').join(',');

  const sql = `
    SELECT 
      p.id_paciente,
      p.nombre_completo,
      COUNT(DISTINCT m.id) AS total_medicamentos,
      COUNT(DISTINCT c.id_condicion) AS total_condiciones,
      COUNT(DISTINCT a.id_alergia) AS total_alergias,
      COUNT(DISTINCT ci.id_cita) AS total_citas,
      SUM(CASE WHEN ci.estado = 'cumplida' THEN 1 ELSE 0 END) AS citas_cumplidas,
      SUM(CASE WHEN ci.estado = 'programada' THEN 1 ELSE 0 END) AS citas_programadas,
      SUM(CASE WHEN ci.estado = 'cancelada' THEN 1 ELSE 0 END) AS citas_canceladas,
      MAX(CASE cm_nivel.nivel WHEN 'Crítica' THEN 'Crítica' WHEN 'Moderada' THEN 'Moderada' ELSE 'Leve' END) AS nivel_max
    FROM paciente p
    LEFT JOIN medicamentos m ON m.paciente_id = p.id_paciente
    LEFT JOIN condicion_medica c ON c.id_paciente = p.id_paciente
    LEFT JOIN alergia a ON a.id_paciente = p.id_paciente
    LEFT JOIN citas ci ON ci.id_paciente = p.id_paciente
    LEFT JOIN condicion_medica cm_nivel ON cm_nivel.id_paciente = p.id_paciente
    WHERE p.id_paciente IN (${placeholders})
    GROUP BY p.id_paciente, p.nombre_completo
  `;

  db.query(sql, idArray, (err, rows) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al comparar pacientes' });
    }
    res.json(rows);
  });
});

// HU-27 / HU-26 / HU-32: Obtener lista de todos los pacientes (usado por selectores de Estadísticas, Panel y Checklist)
app.get('/pacientes', (req, res) => {
  const sql = 'SELECT id_paciente, nombre_completo, fecha_nacimiento FROM paciente ORDER BY nombre_completo ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar pacientes' });
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