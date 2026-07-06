require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
        ensureTomasMedicasColumn('estado', "ALTER TABLE tomas_medicas ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'tomada' AFTER fecha_toma");
        ensureTomasMedicasColumn('motivo_omision', "ALTER TABLE tomas_medicas ADD COLUMN motivo_omision TEXT NULL AFTER estado");
      }
    });

    const createAsignacionesSql = `
      CREATE TABLE IF NOT EXISTS cuidador_pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cuidador_id INT NOT NULL,
        paciente_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_cuidador_paciente (cuidador_id, paciente_id),
        INDEX idx_cuidador_id (cuidador_id),
        INDEX idx_paciente_id (paciente_id)
      )
    `;

    db.query(createAsignacionesSql, (err) => {
      if (err) {
        console.error('Error al crear tabla cuidador_pacientes:', err);
      } else {
        console.log('Tabla cuidador_pacientes verificada/creada correctamente');
      }
    });
  }
});

function ensureTomasMedicasColumn(columnName, alterSql) {
  db.query('SHOW COLUMNS FROM tomas_medicas LIKE ?', [columnName], (err, results) => {
    if (err) {
      console.error(`Error al verificar columna ${columnName} en tomas_medicas:`, err);
      return;
    }

    if (results.length > 0) {
      return;
    }

    db.query(alterSql, (alterErr) => {
      if (alterErr) {
        console.error(`Error al agregar columna ${columnName} en tomas_medicas:`, alterErr);
        return;
      }

      console.log(`Columna ${columnName} agregada correctamente a tomas_medicas`);
    });
  });
}



function esCorreoDominioPermitido(email) {
  const emailRegex = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
  const correo = String(email || '').trim().toLowerCase();
  if (!emailRegex.test(correo)) return false;

  const dominiosPermitidos = new Set([
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'yahoo.com',
    'icloud.com',
    'proton.me',
    'protonmail.com'
  ]);

  const dominio = correo.split('@')[1] || '';
  return dominiosPermitidos.has(dominio);
}

function separarNombreCompleto(nombreCompleto = '') {
  const limpio = String(nombreCompleto || '').trim().replace(/\s+/g, ' ');
  if (!limpio) {
    return { nombres: 'Usuario', apellidos: 'Google' };
  }

  const partes = limpio.split(' ');
  if (partes.length === 1) {
    return { nombres: partes[0], apellidos: 'Google' };
  }

  return {
    nombres: partes.slice(0, -1).join(' '),
    apellidos: partes.slice(-1).join(' ')
  };
}

function generarSoloNumeros(longitud) {
  let salida = '';
  while (salida.length < longitud) {
    salida += crypto.randomInt(0, 10).toString();
  }
  return salida.slice(0, longitud);
}

async function generarIdentidadUnica() {
  for (let intento = 0; intento < 20; intento++) {
    const candidata = generarSoloNumeros(13);
    const existe = await queryAsync('SELECT id FROM usuarios WHERE identidad = ? LIMIT 1', [candidata]);
    if (existe.length === 0) {
      return candidata;
    }
  }
  throw new Error('No se pudo generar una identidad unica');
}

async function verificarIdTokenGoogle(idToken) {
  const respuesta = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!respuesta.ok) {
    throw new Error('Token de Google invalido o expirado');
  }

  const payload = await respuesta.json();
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID no configurado');
  }

  if (payload.aud !== clientId) {
    throw new Error('El token no pertenece a esta aplicacion');
  }

  if (String(payload.email_verified) !== 'true') {
    throw new Error('La cuenta de Google no tiene correo verificado');
  }

  return payload;
}

app.get('/auth/config', (req, res) => {
  res.json({
    ok: true,
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
});

app.post('/auth/google', async (req, res) => {
  try {
    const { idToken, rememberMe, nombres, apellidos, identidad, telefono, googleFlow } = req.body || {};
    const tokenGoogle = String(idToken || '').trim();

    if (!tokenGoogle) {
      return res.status(400).json({ ok: false, mensaje: 'idToken es requerido' });
    }

    const payload = await verificarIdTokenGoogle(tokenGoogle);
    const correo = String(payload.email || '').trim().toLowerCase();
    if (!correo) {
      return res.status(400).json({ ok: false, mensaje: 'No se pudo obtener el correo de Google' });
    }

    const existentes = await queryAsync('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [correo]);
    let usuario = existentes[0];
    let usuarioCreado = false;

    if (!usuario) {
      const nombreSugerido = separarNombreCompleto(payload.name || '');
      const nombresFinal = String(nombres || '').trim() || String(payload.given_name || '').trim() || nombreSugerido.nombres;
      const apellidosFinal = String(apellidos || '').trim() || String(payload.family_name || '').trim() || nombreSugerido.apellidos;
      const identidadLimpia = String(identidad || '').replace(/\D/g, '');
      const telefonoLimpio = String(telefono || '').replace(/\D/g, '');

      const identidadValida = /^\d{13}$/.test(identidadLimpia);
      const telefonoValido = /^\d{8}$/.test(telefonoLimpio);
      const flujoGoogle = String(googleFlow || '').toLowerCase();
      const intentoRegistro = flujoGoogle === 'register' || identidadLimpia.length > 0 || telefonoLimpio.length > 0;

      if (!identidadValida || !telefonoValido) {
        if (!intentoRegistro || flujoGoogle === 'login') {
          return res.status(400).json({
            ok: false,
            mensaje: 'No encontramos una cuenta para este correo. Primero registrate y luego inicia sesion con Google.'
          });
        }

        return res.status(400).json({
          ok: false,
          mensaje: 'Para registrarte con Google hazlo con identidad y telefono llenos (identidad de 13 digitos y telefono de 8 digitos).'
        });
      }

      const identidadDuplicada = await queryAsync('SELECT id FROM usuarios WHERE identidad = ? LIMIT 1', [identidadLimpia]);
      if (identidadDuplicada.length > 0) {
        return res.status(400).json({ ok: false, mensaje: 'La identidad ya esta registrada.' });
      }

      const passwordTemporal = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(passwordTemporal, 10);

      const resultadoInsert = await queryAsync(`INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password) VALUES (?, ?, ?, ?, ?, ?)`,
        [nombresFinal, apellidosFinal, identidadLimpia, telefonoLimpio, correo, hashedPassword]
      );

      const nuevos = await queryAsync('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [resultadoInsert.insertId]);
      usuario = nuevos[0];
      usuarioCreado = true;
    }

    if (!usuario) {
      return res.status(500).json({ ok: false, mensaje: 'No se pudo obtener el usuario autenticado' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const duracion = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
    authTokens[token] = {
      userId: usuario.id,
      email: usuario.email,
      expires: Date.now() + duracion,
      rememberMe: Boolean(rememberMe)
    };

    return res.status(200).json({
      ok: true,
      usuario,
      token,
      usuarioCreado,
      mensaje: usuarioCreado ? 'Cuenta creada con Google e inicio de sesion exitoso' : 'Inicio de sesion con Google exitoso'
    });
  } catch (error) {
    const mensaje = String(error?.message || '').includes('GOOGLE_CLIENT_ID')
      ? 'El inicio de sesion con Google no esta configurado en el servidor'
      : 'No se pudo autenticar con Google';
    return res.status(400).json({ ok: false, mensaje, detalle: error?.message || null });
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
  const correoNormalizado = String(email || '').trim().toLowerCase();
  const passwordTexto = String(password || '').trim();

  const correoValido = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/.test(correoNormalizado);
  const passwordPresente = passwordTexto.length > 0;

  if (!correoValido && !passwordPresente) {
    return res.status(400).json({ code: 'AMBOS_INVALIDOS', mensaje: 'Correo y contrase�a incorrectos.' });
  }
  if (!correoValido) {
    return res.status(400).json({ code: 'EMAIL_INVALIDO', mensaje: 'Correo incorrecto.' });
  }
  if (!passwordPresente) {
    return res.status(400).json({ code: 'PASSWORD_INVALIDA', mensaje: 'Contrase�a incorrecta.' });
  }

  // Consulta SQL para buscar el usuario por email
  const sql = 'SELECT * FROM usuarios WHERE email = ?';

  db.query(sql, [correoNormalizado], async (err, results) => {

    if (err) {
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    // Si no se encontr� ning�n usuario con ese email
    if (results.length === 0) {
      return res.status(401).json({ code: 'EMAIL_INVALIDO', mensaje: 'Correo incorrecto.' });
    }

    const usuario = results[0];

    // Comparar contrase�as usando bcrypt
    const passwordValida = await bcrypt.compare(passwordTexto, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ code: 'PASSWORD_INVALIDA', mensaje: 'Contrase�a incorrecta.' });
    }


    // Generar token de autenticaci�n
    const token = crypto.randomBytes(32).toString('hex');
    const expiresIn = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000; // 7 d�as o 30 minutos
    const expiresAt = Date.now() + expiresIn;
    
    // Guardar token en memoria
    authTokens[token] = {
      userId: usuario.id,
      email: usuario.email,
      expires: expiresAt,
      rememberMe: rememberMe || false
    };

    // Si todo est� correcto
    res.status(200).json({
      ok: true,
      mensaje: 'Inicio de sesi�n exitoso',
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

// ============================================
// MIDDLEWARE DE VERIFICACIÓN DE ROLES
// ============================================

/**
 * Middleware para verificar si el usuario tiene un rol permitido
 * @param {string[]} rolesPermitidos - Array de roles permitidos
 */
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

    // Obtener el usuario de la base de datos para verificar su rol actual
    const sql = 'SELECT rol FROM usuarios WHERE id = ?';
    db.query(sql, [session.userId], (err, results) => {
      if (err) {
        console.error('Error al verificar rol:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al verificar permisos' });
      }

      if (results.length === 0) {
        return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      }

      const userRol = results[0].rol;

      if (!rolesPermitidos.includes(userRol)) {
        return res.status(403).json({ 
          ok: false, 
          mensaje: 'Acceso denegado. No tienes permisos para realizar esta acción.',
          rolRequerido: rolesPermitidos,
          rolActual: userRol
        });
      }

      // Guardar información del usuario en la request para uso posterior
      req.user = {
        id: session.userId,
        email: session.email,
        rol: userRol
      };

      next();
    });
  };
}





// Registro
app.post("/registrar", (req, res) => {
  const { nombres, apellidos, identidad, telefono, email, password } = req.body;
  const correoNormalizado = String(email || '').trim().toLowerCase();

  if (!esCorreoDominioPermitido(correoNormalizado)) {
    return res.status(400).json({ ok: false, mensaje: "El correo no pertenece a un dominio permitido." });
  }

  // Verificar si el correo o identidad ya existen
  const verificarSql = "SELECT * FROM usuarios WHERE email = ? OR identidad = ?";
  db.query(verificarSql, [correoNormalizado, identidad], async (err, resultados) => {

    if (err) {
      //console.error("Error al verificar duplicados:", err);
      return res.json({ ok: false, mensaje: "Error al verificar datos" });
    }

    if (resultados.length > 0) {
      // Verificar cuál campo está duplicado
      const correoExiste = resultados.some((r) => String(r.email || '').toLowerCase() === correoNormalizado);
      const identidadExiste = resultados.some((r) => r.identidad === identidad);

      if (correoExiste && identidadExiste) {
        return res.json({ ok: false, mensaje: "El correo y la identidad ya están registrados" });
      } else if (correoExiste) {
        return res.json({ ok: false, mensaje: "El correo ya está registrado" });
      } else if (identidadExiste) {
        return res.json({ ok: false, mensaje: "La identidad ya está registrada" });
      }
    }

    // Si no hay duplicados, hashear la contraseña e insertar el nuevo usuario
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const sql = `
      INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nombres, apellidos, identidad, telefono, correoNormalizado, hashedPassword], (err, result) => {

      if (err) {
        //console.error("Error al registrar usuario:", err); 
        return res.json({ ok: false, mensaje: "Error al registrar usuario" });
      }

      res.json({ ok: true, mensaje: "Usuario registrado con éxito" });
    });
  });
});





// Registro de usuario con rol - Solo administrador
app.post("/registraradm", verificarRol(['administrador']), async (req, res) => {

  const { nombres, apellidos, identidad, telefono, email, password, rol } = req.body;
  const correoNormalizado = String(email || '').trim().toLowerCase();

  // Validación básica
  if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  if (!esCorreoDominioPermitido(correoNormalizado)) {
    return res.status(400).json({ error: "El correo no pertenece a un dominio permitido." });
  }

  // Hashear la contraseña antes de insertar
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // SQL para insertar el usuario
  const sql = `
    INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password, rol)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

db.query(sql, [nombres, apellidos, identidad, telefono, correoNormalizado, hashedPassword, rol], (err, result) => {


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
  const { nombre, dosis, frecuencia_horas, hora, paciente_id, estado, fecha_inicio, fecha_fin, notas } = req.body;

  if (!nombre || !dosis || !frecuencia_horas || !hora || !paciente_id) {
    return res.status(400).json({ mensaje: 'Campos incompletos. Se requiere nombre, dosis, frecuencia, hora y paciente' });
  }

  const sql = `INSERT INTO Registro_medicamentos 
    (nombre, dosis, frecuencia_horas, hora, paciente_id, estado, fecha_inicio, fecha_fin, notas) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.query(sql, [nombre, dosis, frecuencia_horas, hora, paciente_id, estado || 'activo', fecha_inicio || null, fecha_fin || null, notas || null], (err, result) => {
    if (err) {
      console.error('Error al guardar en Registro_medicamentos:', err);
      return res.status(500).json({ mensaje: 'Error al guardar en la base de datos', error: err.message });
    }
    res.json({ mensaje: 'Medicamento registrado correctamente', id: result.insertId });
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

// Actualizar medicamento
app.put('/Registro_medicamentos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, dosis, frecuencia_horas, hora, paciente_id, estado, fecha_inicio, fecha_fin, notas } = req.body;

  if (!nombre || !dosis || !frecuencia_horas || !hora || !paciente_id) {
    return res.status(400).json({ mensaje: 'Campos incompletos. Se requiere nombre, dosis, frecuencia, hora y paciente' });
  }

  const sql = `UPDATE Registro_medicamentos 
    SET nombre = ?, dosis = ?, frecuencia_horas = ?, hora = ?, paciente_id = ?, estado = ?, fecha_inicio = ?, fecha_fin = ?, notas = ? 
    WHERE id = ?`;
  
  db.query(sql, [nombre, dosis, frecuencia_horas, hora, paciente_id, estado || 'activo', fecha_inicio || null, fecha_fin || null, notas || null, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar medicamento:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar en la base de datos', error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Medicamento no encontrado' });
    }
    
    res.json({ mensaje: 'Medicamento actualizado correctamente' });
  });
});

// Eliminar medicamento
app.delete('/Registro_medicamentos/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM Registro_medicamentos WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar medicamento:', err);
      return res.status(500).json({ mensaje: 'Error al eliminar de la base de datos', error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Medicamento no encontrado' });
    }
    
    res.json({ mensaje: 'Medicamento eliminado correctamente' });
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

let tokens = {}; // tokens de recuperación de contraseña
let authTokens = {}; // tokens de autenticación de sesión


// 1?? Enviar token
app.post("/enviar-token", (req, res) => {
  const { correo } = req.body;
  const correoNormalizado = String(correo || "").trim().toLowerCase();
  const allowDevRecovery = String(process.env.ALLOW_DEV_RECOVERY || "").toLowerCase() === "true";

  if (!correoNormalizado) {
    return res.json({ ok: false, message: "Correo requerido" });
  }

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  db.query(sql, [correoNormalizado], async (err, results) => {
    if (err) return res.json({ ok: false, message: "Error DB" });
    if (results.length === 0) {
      return res.json({ ok: false, message: "No existe una cuenta con ese correo" });
    }

    const token = crypto.randomBytes(4).toString("hex");
    tokens[correoNormalizado] = { token, expires: Date.now() + 15 * 60 * 1000 }; // 15 min

    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      if (!allowDevRecovery) {
        return res.json({
          ok: false,
          message: "SMTP no configurado. Define MAIL_USER y MAIL_PASS en el servidor."
        });
      }

      console.warn("MAIL_USER / MAIL_PASS no configurados. Token de recuperacion para pruebas:", token);
      return res.json({
        ok: true,
        message: "Codigo generado en modo local. Revisa la consola del servidor.",
        devToken: token
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      });

      await transporter.sendMail({
        from: `"SISCOM" <${process.env.MAIL_USER}>`,
        to: correoNormalizado,
        subject: "Recuperacion de contrasena",
        html: `
          <p>Tu codigo de verificacion es:</p>
          <h3>${token}</h3>
          <p>El codigo expira en 15 minutos.</p>
        `,
      });

      return res.json({ ok: true, message: "Correo de verificacion enviado" });
    } catch (mailErr) {
      console.error("Error al enviar correo de recuperacion:", mailErr.message || mailErr);

      if (!allowDevRecovery) {
        return res.json({
          ok: false,
          message: "No se pudo enviar el correo de verificacion",
          mailError: String(mailErr?.message || "Error SMTP")
        });
      }

      console.warn("Usando modo local de recuperacion. Codigo:", token);
      return res.json({
        ok: true,
        message: "No se pudo enviar el correo. Usa el codigo mostrado para continuar.",
        devToken: token,
        mailError: String(mailErr?.message || "Error SMTP")
      });
    }
  });
});

// 2?? Verificar token
app.post("/verificar-token", (req, res) => {
  const { correo, tokenIngresado } = req.body;
  const correoNormalizado = String(correo || "").trim().toLowerCase();
  const record = tokens[correoNormalizado];

  if (!record) return res.json({ ok: false, message: "Token no encontrado" });
  if (Date.now() > record.expires) return res.json({ ok: false, message: "Token expirado" });
  if (record.token !== tokenIngresado) return res.json({ ok: false, message: "Token incorrecto" });

  return res.json({ ok: true, message: "Token verificado" });
});

// 3?? Actualizar contrasena
app.post("/actualizar-password", async (req, res) => {
  const { correo, nuevaPassword } = req.body;
  const correoNormalizado = String(correo || "").trim().toLowerCase();
  const allowDevRecovery = String(process.env.ALLOW_DEV_RECOVERY || "").toLowerCase() === "true";

  if (!correoNormalizado || !nuevaPassword) {
    return res.json({ ok: false, message: "Datos incompletos" });
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

  const sql = "UPDATE usuarios SET password = ? WHERE email = ?";
  db.query(sql, [hashedPassword, correoNormalizado], (err) => {
    if (err) return res.json({ ok: false, message: "Error al actualizar" });

    delete tokens[correoNormalizado];
    return res.json({ ok: true, message: "Contrasena actualizada correctamente" });
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
  const { 
    id_paciente, 
    fecha_hora, 
    motivo, 
    anticipacion_min,
    doctor,
    especialidad,
    ubicacion,
    estado,
    notas
  } = req.body;

  if (!id_paciente || !fecha_hora || !motivo) {
    return res.status(400).json({ mensaje: 'Campos incompletos. Se requiere paciente, fecha/hora y motivo.' });
  }

  const sql = `INSERT INTO citas (
    id_paciente, 
    fecha_hora, 
    motivo, 
    anticipacion_min,
    doctor,
    especialidad,
    ubicacion,
    estado,
    notas
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    id_paciente, 
    fecha_hora, 
    motivo, 
    anticipacion_min || 60,
    doctor || null,
    especialidad || null,
    ubicacion || null,
    estado || 'programada',
    notas || null
  ], (err, result) => {
    if (err) {
      console.error('=== ERROR AL GUARDAR CITA ===');
      console.error('Error SQL:', err);
      console.error('Código de error:', err.code);
      console.error('Mensaje de error:', err.message);
      console.error('SQL State:', err.sqlState);
      console.error('Datos recibidos:', { id_paciente, fecha_hora, motivo, anticipacion_min, doctor, especialidad, ubicacion, estado, notas });
      console.error('=============================');
      return res.status(500).json({ 
        mensaje: 'Error al guardar la cita en la base de datos.', 
        error: err.message,
        code: err.code,
        sqlState: err.sqlState
      });
    }
    res.status(200).json({ mensaje: 'Cita registrada correctamente.', id: result.insertId });
  });

});

// Actualizar cita existente
app.put('/actualizarCita/:id', (req, res) => {
  const { id } = req.params;
  const { 
    id_paciente, 
    fecha_hora, 
    motivo, 
    anticipacion_min,
    doctor,
    especialidad,
    ubicacion,
    estado,
    notas
  } = req.body;

  if (!id_paciente || !fecha_hora || !motivo) {
    return res.status(400).json({ mensaje: 'Campos incompletos. Se requiere paciente, fecha/hora y motivo.' });
  }

  const sql = `UPDATE citas SET 
    id_paciente = ?,
    fecha_hora = ?,
    motivo = ?,
    anticipacion_min = ?,
    doctor = ?,
    especialidad = ?,
    ubicacion = ?,
    estado = ?,
    notas = ?
  WHERE id_cita = ?`;

  db.query(sql, [
    id_paciente, 
    fecha_hora, 
    motivo, 
    anticipacion_min || 60,
    doctor || null,
    especialidad || null,
    ubicacion || null,
    estado || 'programada',
    notas || null,
    id
  ], (err, result) => {
    if (err) {
      console.error('Error al actualizar cita:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar la cita en la base de datos.', error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    }
    
    res.status(200).json({ mensaje: 'Cita actualizada correctamente.' });
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
  console.log('=== DELETE /eliminarCita ===');
  console.log('ID recibido:', id);
  
  const sql = 'DELETE FROM citas WHERE id_cita = ?';
  console.log('SQL:', sql);
  console.log('Valores:', [id]);
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error SQL al eliminar cita:', err);
      console.error('Código de error:', err.code);
      console.error('Mensaje de error:', err.message);
      return res.status(500).json({ 
        mensaje: 'Error al eliminar la cita.', 
        error: err.message,
        code: err.code 
      });
    }
    console.log('Resultado de la eliminación:', result);
    console.log('Filas afectadas:', result.affectedRows);
    res.status(200).json({ mensaje: 'Cita eliminada correctamente.' });
  });
});



// Eliminar todas las citas - Solo administrador
app.delete('/eliminarTodasCitas', verificarRol(['administrador']), (req, res) => {
  const sql = 'DELETE FROM citas';
  
  db.query(sql, (err, result) => {
    if (err) {
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

app.post('/guardarPedido', async (req, res) => {
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

  try {
    // 1) Verificar que hay stock suficiente en inventario para TODOS los items
    //    antes de guardar nada, para no dejar el pedido a medias.
    for (const item of items) {
      const filas = await queryAsync('SELECT id, cantidad FROM inventario WHERE nombre = ? LIMIT 1', [item.nombre]);
      if (filas.length === 0) {
        return res.status(400).json({ mensaje: `El medicamento "${item.nombre}" no existe en el inventario` });
      }
      if (Number(filas[0].cantidad) < Number(item.cantidad)) {
        return res.status(400).json({
          mensaje: `Stock insuficiente de "${item.nombre}" (disponible: ${filas[0].cantidad}, solicitado: ${item.cantidad})`
        });
      }
    }

    // 2) Guardar el pedido
    const sqlPedido = 'INSERT INTO pedidos_farmacia (id, farmacia, notas, estado, fecha_creacion, id_usuario) VALUES (?, ?, ?, ?, ?, ?)';

    // fecha_creacion puede no venir del cliente; el servidor siempre debe
    // enviar un valor definido a mysql (undefined revienta el driver con
    // "Bind parameters must not contain undefined").
    const fechaCreacionFinal = fecha_creacion || new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryAsync(sqlPedido, [id, farmacia, notas || null, estado || 'Pendiente', fechaCreacionFinal, id_usuario || null]);

    // 3) Guardar los items del pedido
    try {
      const sqlItems = 'INSERT INTO pedidos_items (pedido_id, nombre_medicamento, dosis, cantidad) VALUES ?';
      const values = items.map(item => [id, item.nombre, item.dosis, item.cantidad]);
      await queryAsync(sqlItems, [values]);
    } catch (errItems) {
      await queryAsync('DELETE FROM pedidos_farmacia WHERE id = ?', [id]).catch(() => {});
      return res.status(500).json({
        mensaje: 'Error al guardar items del pedido',
        error: errItems.message
      });
    }

    // 4) Descontar el stock del inventario por cada item del pedido
    for (const item of items) {
      await queryAsync(
        'UPDATE inventario SET cantidad = cantidad - ? WHERE nombre = ?',
        [item.cantidad, item.nombre]
      );
    }

    res.json({ mensaje: 'Pedido guardado correctamente' });
  } catch (err) {
    //console.error('Error al guardar pedido:', err);
    res.status(500).json({
      mensaje: 'Error al guardar el pedido',
      error: err.message
    });
  }
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

// Eliminar todos los pedidos - Solo administrador
app.delete('/eliminarTodosPedidos', verificarRol(['administrador']), (req, res) => {
  const sql = 'DELETE FROM pedidos_farmacia';
  
  db.query(sql, (err, result) => {
    if (err) {
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
  
  console.log('=== GET /recetas/:id_usuario ===');
  console.log('ID Usuario recibido:', id_usuario);

  const sql = 'SELECT * FROM recetas_medicas WHERE id_usuario = ? ORDER BY fecha_subida DESC';
  console.log('SQL Query:', sql);
  console.log('Parámetros:', [id_usuario]);
  
  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar recetas:', err);
      return res.status(500).json({ mensaje: 'Error al cargar recetas' });
    }
    
    console.log('Resultados encontrados:', results.length);
    console.log('Recetas:', JSON.stringify(results, null, 2));
    console.log('================================');
    
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
// RUTAS DE USUARIOS (PROTEGIDAS - SOLO ADMINISTRADOR)
// ============================================

// Obtener todos los usuarios - Solo administrador
app.get('/usuarios', verificarRol(['administrador']), (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar usuarios' });
    res.json(results);
  });
});


// Actualizar usuario - Solo administrador
app.put('/usuarios/:id', verificarRol(['administrador']), async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, identidad, telefono, email, password, rol } = req.body;
  const correoNormalizado = String(email || '').trim().toLowerCase();
  const passwordTexto = String(password || '').trim();

  // Validacion basica (password opcional al editar)
  if (!nombres || !apellidos || !identidad || !telefono || !email || !rol) {
    return res.status(400).json({ mensaje: 'Todos los campos obligatorios deben completarse.' });
  }

  if (!esCorreoDominioPermitido(correoNormalizado)) {
    return res.status(400).json({ mensaje: 'El correo no pertenece a un dominio permitido.' });
  }

  // Verificar si el correo o identidad ya existen en otro usuario
  const verificarSql = "SELECT * FROM usuarios WHERE (email = ? OR identidad = ?) AND id != ?";
  db.query(verificarSql, [correoNormalizado, identidad, id], async (err, resultados) => {
    if (err) {
      console.error('Error al verificar duplicados:', err);
      return res.status(500).json({ mensaje: 'Error al verificar datos duplicados' });
    }

    if (resultados.length > 0) {
      const correoExiste = resultados.some((r) => String(r.email || '').toLowerCase() === correoNormalizado);
      const identidadExiste = resultados.some((r) => r.identidad === identidad);

      if (correoExiste && identidadExiste) {
        return res.status(400).json({ mensaje: 'El correo y la identidad ya estan registrados en otro usuario' });
      } else if (correoExiste) {
        return res.status(400).json({ mensaje: 'El correo ya esta registrado en otro usuario' });
      } else if (identidadExiste) {
        return res.status(400).json({ mensaje: 'La identidad ya esta registrada en otro usuario' });
      }
    }

    // Construir UPDATE dinamico: password solo si se envio una nueva
    const campos = ['nombres = ?', 'apellidos = ?', 'identidad = ?', 'telefono = ?', 'email = ?', 'rol = ?'];
    const valores = [nombres, apellidos, identidad, telefono, correoNormalizado, rol];

    if (passwordTexto.length > 0) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(passwordTexto, saltRounds);
      campos.push('password = ?');
      valores.push(hashedPassword);
    }

    valores.push(id);

    const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
    db.query(sql, valores, (err, result) => {
      if (err) {
        console.error('Error al actualizar usuario:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          if (err.message.includes('email')) {
            return res.status(400).json({ mensaje: 'El correo electronico ya esta registrado' });
          } else if (err.message.includes('identidad')) {
            return res.status(400).json({ mensaje: 'La identidad ya esta registrada' });
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

// Obtener perfil del paciente autenticado
app.get('/mi-perfil', verificarRol(['usuario']), (req, res) => {
  const sql = 'SELECT id, nombres, apellidos, identidad, telefono, email, rol FROM usuarios WHERE id = ? LIMIT 1';
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cargar tu perfil' });
    }

    if (!results.length) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    return res.json({ usuario: results[0] });
  });
});

// Actualizar perfil del paciente autenticado
app.put('/mi-perfil', verificarRol(['usuario']), (req, res) => {
  const { nombres, apellidos, identidad, telefono, email } = req.body || {};

  const nombresTxt = String(nombres || '').trim();
  const apellidosTxt = String(apellidos || '').trim();
  const identidadTxt = String(identidad || '').replace(/\D/g, '');
  const telefonoTxt = String(telefono || '').replace(/\D/g, '');
  const correoNormalizado = String(email || '').trim().toLowerCase();

  if (!nombresTxt || !apellidosTxt || !identidadTxt || !telefonoTxt || !correoNormalizado) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  if (!/^\d{13}$/.test(identidadTxt)) {
    return res.status(400).json({ mensaje: 'La identidad debe contener 13 digitos.' });
  }

  if (!/^\d{8}$/.test(telefonoTxt)) {
    return res.status(400).json({ mensaje: 'El telefono debe contener 8 digitos.' });
  }

  if (!esCorreoDominioPermitido(correoNormalizado)) {
    return res.status(400).json({ mensaje: 'El correo no pertenece a un dominio permitido.' });
  }

  const sqlDuplicados = 'SELECT id, email, identidad FROM usuarios WHERE (email = ? OR identidad = ?) AND id != ?';
  db.query(sqlDuplicados, [correoNormalizado, identidadTxt, req.user.id], (errDup, duplicados) => {
    if (errDup) {
      return res.status(500).json({ mensaje: 'Error al validar datos duplicados' });
    }

    if (Array.isArray(duplicados) && duplicados.length > 0) {
      const correoExiste = duplicados.some((r) => String(r.email || '').toLowerCase() === correoNormalizado);
      const identidadExiste = duplicados.some((r) => String(r.identidad || '') === identidadTxt);

      if (correoExiste && identidadExiste) {
        return res.status(400).json({ mensaje: 'El correo y la identidad ya estan registrados.' });
      }
      if (correoExiste) {
        return res.status(400).json({ mensaje: 'El correo ya esta registrado.' });
      }
      if (identidadExiste) {
        return res.status(400).json({ mensaje: 'La identidad ya esta registrada.' });
      }
    }

    const sqlUpdate = 'UPDATE usuarios SET nombres = ?, apellidos = ?, identidad = ?, telefono = ?, email = ? WHERE id = ?';
    db.query(sqlUpdate, [nombresTxt, apellidosTxt, identidadTxt, telefonoTxt, correoNormalizado, req.user.id], (errUpd) => {
      if (errUpd) {
        return res.status(500).json({ mensaje: 'Error al actualizar tu perfil' });
      }

      const sqlUsuario = 'SELECT id, nombres, apellidos, identidad, telefono, email, rol FROM usuarios WHERE id = ? LIMIT 1';
      db.query(sqlUsuario, [req.user.id], (errUser, users) => {
        if (errUser) {
          return res.status(500).json({ mensaje: 'Perfil actualizado, pero no se pudo recargar la informacion.' });
        }

        return res.json({
          mensaje: 'Datos actualizados correctamente.',
          usuario: users && users[0] ? users[0] : {
            id: req.user.id,
            nombres: nombresTxt,
            apellidos: apellidosTxt,
            identidad: identidadTxt,
            telefono: telefonoTxt,
            email: correoNormalizado,
            rol: 'usuario'
          }
        });
      });
    });
  });
});

// Eliminar usuario - Solo administrador
app.delete('/usuarios/:id', verificarRol(['administrador']), (req, res) => {
  const { id } = req.params;
  
  // Evitar que un administrador se elimine a sí mismo
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario' });
  }
  
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
  const {
    id_usuario,
    id_receta,
    nombre_medicamento,
    hora_toma,
    fecha_toma,
    estado = 'tomada',
    motivo_omision = null
  } = req.body;

  if (!id_usuario || !id_receta || !nombre_medicamento || !hora_toma || !fecha_toma) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  if (!['tomada', 'no_tomada'].includes(estado)) {
    return res.status(400).json({ mensaje: 'Estado de toma no valido' });
  }

  if (estado === 'no_tomada' && !motivo_omision) {
    return res.status(400).json({ mensaje: 'Debes indicar el motivo de la omision' });
  }

  const sql = `
    INSERT INTO tomas_medicas
      (id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma, estado, motivo_omision)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [id_usuario, id_receta, nombre_medicamento, hora_toma, fecha_toma, estado, motivo_omision], (err, result) => {
    if (err) {
      console.error('Error al guardar toma:', err);
      return res.status(500).json({ mensaje: 'Error al guardar' });
    }

    res.json({
      mensaje: estado === 'no_tomada' ? 'Omision registrada y notificada al cuidador' : 'Toma registrada',
      puntos_ganados: estado === 'tomada' ? 10 : 0,
      evento: {
        id: result.insertId,
        estado,
        motivo_omision
      }
    });
  });
});

app.get('/tomasHoy/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT *
    FROM tomas_medicas
    WHERE id_usuario = ? AND DATE(fecha_toma) = CURDATE()
    ORDER BY hora_toma DESC, id DESC
  `;
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
  const sql = `
    SELECT *
    FROM tomas_medicas
    WHERE id_usuario = ? AND fecha_toma >= ? AND fecha_toma < DATE_ADD(?, INTERVAL 1 DAY)
    ORDER BY hora_toma ASC, id ASC
  `;
  db.query(sql, [id_usuario, fecha, fecha], (err, results) => {
    if (err) {
      console.error('Error SQL al cargar tomas:', err);
      return res.status(500).json({ mensaje: 'Error al cargar', error: err.message, sql: sql });
    }
    console.log(`Tomas encontradas: ${results.length}`);
    res.json(results);
  });
});

app.get('/historialMedicacionEventos/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT *
    FROM tomas_medicas
    WHERE id_usuario = ?
    ORDER BY fecha_toma DESC, hora_toma DESC, id DESC
  `;

  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al cargar historial de medicacion:', err);
      return res.status(500).json({ mensaje: 'Error al cargar historial de medicacion' });
    }

    res.json(results);
  });
});

app.get('/alertasOmisiones', (req, res) => {
  const sql = `
    SELECT
      t.id,
      t.id_usuario,
      t.id_receta,
      t.nombre_medicamento,
      t.hora_toma,
      t.fecha_toma,
      t.motivo_omision,
      CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_paciente
    FROM tomas_medicas t
    INNER JOIN usuarios u ON u.id = t.id_usuario
    WHERE t.estado = 'no_tomada' AND DATE(t.fecha_toma) = CURDATE()
    ORDER BY t.fecha_toma DESC, t.hora_toma DESC, t.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al cargar alertas de omisiones:', err);
      return res.status(500).json({ mensaje: 'Error al cargar alertas de omisiones' });
    }

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

  console.log('Validaciones pasadas. Iniciando transacci�n...');

  // Iniciar transacci�n
  db.beginTransaction(err => {
    if (err) {
      console.error('Error al iniciar transacci�n:', err);
      return res.status(500).json({ mensaje: 'Error al iniciar transacci�n', error: err.message });
    }

    console.log('Transacci�n iniciada. Desactivando horarios existentes...');

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

        // 3. Guardar configuraci�n
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
        
        console.log('Guardando configuraci�n:', {
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
            console.error('Error al guardar configuraci�n:', err);
            return db.rollback(() => {
              res.status(500).json({ mensaje: 'Error al guardar configuraci�n', error: err.message });
            });
          }

          console.log('Configuraci�n guardada. Confirmando transacci�n...');

          // Confirmar transacci�n
          db.commit(err => {
            if (err) {
              console.error('Error al confirmar transacci�n:', err);
              return db.rollback(() => {
                res.status(500).json({ mensaje: 'Error al confirmar transacci�n', error: err.message });
              });
            }

            console.log('=== Transacci�n completada exitosamente ===');

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


// Actualizar un horario espec�fico
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
      return res.status(400).json({ mensaje: 'Formato de hora inv�lido. Use HH:MM o HH:MM:SS' });
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

// Eliminar un horario espec�fico
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

  // Obtener todos los horarios activos del usuario, excluyendo la receta actual si se est� editando
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
    const margenMinutos = 30; // Margen m�nimo entre medicamentos

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

    // Procesar resultados para incluir d�as de la semana como array
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

app.get('/asignaciones-cuidador', verificarRol(['administrador']), (req, res) => {
  const sqlCuidadores = "SELECT id, nombres, apellidos, email FROM usuarios WHERE rol = 'empleado' ORDER BY nombres, apellidos";
  const sqlPacientes = "SELECT id, nombres, apellidos, email FROM usuarios WHERE rol = 'usuario' ORDER BY nombres, apellidos";
  const sqlAsignaciones = `
    SELECT cp.cuidador_id, cp.paciente_id,
           c.nombres AS cuidador_nombres, c.apellidos AS cuidador_apellidos,
           p.nombres AS paciente_nombres, p.apellidos AS paciente_apellidos
    FROM cuidador_pacientes cp
    INNER JOIN usuarios c ON c.id = cp.cuidador_id
    INNER JOIN usuarios p ON p.id = cp.paciente_id
    ORDER BY c.nombres, c.apellidos, p.nombres, p.apellidos
  `;

  db.query(sqlCuidadores, (errCuidadores, cuidadores) => {
    if (errCuidadores) {
      return res.status(500).json({ mensaje: 'Error al cargar cuidadores' });
    }

    db.query(sqlPacientes, (errPacientes, pacientes) => {
      if (errPacientes) {
        return res.status(500).json({ mensaje: 'Error al cargar pacientes' });
      }

      db.query(sqlAsignaciones, (errAsignaciones, asignaciones) => {
        if (errAsignaciones) {
          return res.status(500).json({ mensaje: 'Error al cargar asignaciones' });
        }

        res.json({ cuidadores, pacientes, asignaciones });
      });
    });
  });
});

app.get('/asignaciones-cuidador/:cuidadorId', verificarRol(['administrador']), (req, res) => {
  const { cuidadorId } = req.params;
  const sql = `
    SELECT paciente_id
    FROM cuidador_pacientes
    WHERE cuidador_id = ?
    ORDER BY paciente_id
  `;

  db.query(sql, [cuidadorId], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cargar asignaciones del cuidador' });
    }

    res.json(results.map((row) => row.paciente_id));
  });
});

app.post('/asignaciones-cuidador/:cuidadorId', verificarRol(['administrador']), (req, res) => {
  const { cuidadorId } = req.params;
  const { pacientes } = req.body;

  const cuidadorIdNum = parseInt(cuidadorId, 10);
  const pacientesIds = Array.isArray(pacientes)
    ? [...new Set(pacientes.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

  if (!Number.isInteger(cuidadorIdNum) || cuidadorIdNum <= 0) {
    return res.status(400).json({ mensaje: 'Cuidador inválido' });
  }

  const sqlValidarCuidador = "SELECT id FROM usuarios WHERE id = ? AND rol = 'empleado' LIMIT 1";
  db.query(sqlValidarCuidador, [cuidadorIdNum], (errValidar, cuidadores) => {
    if (errValidar) {
      return res.status(500).json({ mensaje: 'Error al validar cuidador' });
    }

    if (!cuidadores.length) {
      return res.status(404).json({ mensaje: 'Cuidador no encontrado' });
    }

    const sqlDelete = 'DELETE FROM cuidador_pacientes WHERE cuidador_id = ?';
    db.query(sqlDelete, [cuidadorIdNum], (errDelete) => {
      if (errDelete) {
        return res.status(500).json({ mensaje: 'Error al actualizar asignaciones' });
      }

      if (!pacientesIds.length) {
        return res.json({ mensaje: 'Asignaciones actualizadas correctamente' });
      }

      const sqlInsert = 'INSERT INTO cuidador_pacientes (cuidador_id, paciente_id) VALUES ?';
      const values = pacientesIds.map((pacienteId) => [cuidadorIdNum, pacienteId]);

      db.query(sqlInsert, [values], (errInsert) => {
        if (errInsert) {
          return res.status(500).json({ mensaje: 'Error al guardar asignaciones' });
        }

        res.json({ mensaje: 'Asignaciones actualizadas correctamente' });
      });
    });
  });
});

app.get('/mis-pacientes', verificarRol(['administrador', 'empleado']), (req, res) => {
  if (req.user.rol === 'administrador') {
    const sqlAdmin = "SELECT id, nombres, apellidos, email FROM usuarios WHERE rol = 'usuario' ORDER BY nombres, apellidos";
    db.query(sqlAdmin, (err, results) => {
      if (err) return res.status(500).json({ mensaje: 'Error al cargar pacientes' });
      res.json(results);
    });
    return;
  }

  const sql = `
    SELECT u.id, u.nombres, u.apellidos, u.email
    FROM cuidador_pacientes cp
    INNER JOIN usuarios u ON u.id = cp.paciente_id
    WHERE cp.cuidador_id = ? AND u.rol = 'usuario'
    ORDER BY u.nombres, u.apellidos
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cargar pacientes asignados' });
    }

    res.json(results);
  });
});

app.get('/mi-cuidador', verificarRol(['usuario']), (req, res) => {
  const sql = `
    SELECT u.id, u.nombres, u.apellidos, u.email, u.telefono
    FROM cuidador_pacientes cp
    INNER JOIN usuarios u ON u.id = cp.cuidador_id
    WHERE cp.paciente_id = ? AND u.rol = 'empleado'
    ORDER BY cp.created_at ASC, u.nombres ASC, u.apellidos ASC
    LIMIT 1
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cargar el cuidador asignado' });
    }

    res.json(results[0] || null);
  });
});

// ============================================
// RUTAS DE ESTADÍSTICAS (HU-27 / HU-42)
// ============================================

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function normalizarEstadoCita(estado) {
  const valor = String(estado || '').toLowerCase();
  if (valor === 'completada' || valor === 'cumplida') return 'cumplida';
  if (valor === 'cancelada') return 'cancelada';
  if (valor === 'vencida') return 'vencida';
  return 'programada';
}

function calcularNivelAdherencia(porcentaje) {
  if (porcentaje >= 90) return 'Excelente';
  if (porcentaje >= 75) return 'Buena';
  if (porcentaje >= 50) return 'Regular';
  return 'Baja';
}

function construirResumenSemanal(porcentaje, totalTomados, totalProgramados) {
  if (totalProgramados === 0) {
    return 'No se encontraron tomas registradas en la semana seleccionada.';
  }
  if (porcentaje >= 90) {
    return `Adherencia excelente. Se registraron ${totalTomados} tomas de ${totalProgramados} programadas.`;
  }
  if (porcentaje >= 75) {
    return `Adherencia buena. Se registraron ${totalTomados} tomas de ${totalProgramados} programadas.`;
  }
  if (porcentaje >= 50) {
    return `Adherencia regular. Se recomienda reforzar el seguimiento de tomas del paciente.`;
  }
  return 'Adherencia baja. Se recomienda revisar el plan de tratamiento y recordatorios.';
}

// Lista simple de pacientes para el selector de estadísticas
app.get('/pacientes', async (req, res) => {
  try {
    const pacientes = await queryAsync(`
      SELECT 
        u.id AS id_paciente,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_completo,
        NULL AS fecha_nacimiento
      FROM usuarios u
      WHERE u.rol = 'usuario'
      ORDER BY u.nombres, u.apellidos
    `);

    res.json(pacientes);
  } catch (error) {
    console.error('Error al cargar pacientes para estadísticas:', error);
    res.status(500).json({ mensaje: 'Error al cargar pacientes' });
  }
});

// Estadísticas individuales por paciente
app.get('/estadisticas/paciente/:id_paciente', async (req, res) => {
  const idPaciente = parseInt(req.params.id_paciente, 10);
  if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
    return res.status(400).json({ mensaje: 'Paciente inválido' });
  }

  try {
    const pacienteRows = await queryAsync(`
      SELECT 
        u.id AS id_paciente,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_completo,
        NULL AS fecha_nacimiento
      FROM usuarios u
      WHERE u.id = ? AND u.rol = 'usuario'
      LIMIT 1
    `, [idPaciente]);

    if (!pacienteRows.length) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }

    const paciente = pacienteRows[0];

    const [medicamentos, alergias, condiciones, citasRows, cumplimientoRows] = await Promise.all([
      queryAsync(`
        SELECT 
          nombre,
          dosis,
          frecuencia_horas AS frecuencia
        FROM Registro_medicamentos
        WHERE paciente_id = ?
        ORDER BY id DESC
      `, [idPaciente]),
      queryAsync(`
        SELECT nombre_alergia
        FROM alergia
        WHERE id_paciente = ?
        ORDER BY id ASC
      `, [idPaciente]),
      queryAsync(`
        SELECT nombre_condicion, nivel
        FROM condicion_medica
        WHERE id_paciente = ?
        ORDER BY id ASC
      `, [idPaciente]),
      queryAsync(`
        SELECT estado, COUNT(*) AS total
        FROM citas
        WHERE id_paciente = ?
        GROUP BY estado
      `, [idPaciente]),
      queryAsync(`
        SELECT
          COUNT(*) AS total_programados,
          SUM(CASE WHEN estado = 'tomada' THEN 1 ELSE 0 END) AS total_tomados
        FROM tomas_medicas
        WHERE id_usuario = ?
      `, [idPaciente])
    ]);

    const citasDetalleMap = { programada: 0, cumplida: 0, cancelada: 0, vencida: 0 };
    citasRows.forEach((row) => {
      const estado = normalizarEstadoCita(row.estado);
      citasDetalleMap[estado] = Number(row.total || 0) + Number(citasDetalleMap[estado] || 0);
    });

    const citasDetalle = Object.keys(citasDetalleMap).map((estado) => ({
      estado,
      total: citasDetalleMap[estado]
    }));
    const totalCitas = citasDetalle.reduce((acc, item) => acc + Number(item.total || 0), 0);

    const totalProgramados = Number(cumplimientoRows?.[0]?.total_programados || 0);
    const totalTomados = Number(cumplimientoRows?.[0]?.total_tomados || 0);
    const porcentaje = totalProgramados > 0
      ? Math.round((totalTomados / totalProgramados) * 100)
      : 0;

    res.json({
      paciente,
      medicamentos,
      alergias,
      condiciones,
      citas: {
        total: totalCitas,
        detalle: citasDetalle
      },
      cumplimiento: {
        total_programados: totalProgramados,
        total_tomados: totalTomados,
        porcentaje
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del paciente:', error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas del paciente' });
  }
});

// Comparación entre pacientes
app.get('/estadisticas/comparar', async (req, res) => {
  const idsRaw = String(req.query.ids || '');
  const ids = [...new Set(idsRaw.split(',').map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id) && id > 0))];

  if (!ids.length) {
    return res.status(400).json({ mensaje: 'Debe enviar IDs válidos para comparar' });
  }

  try {
    const resultados = [];

    for (const idPaciente of ids) {
      const pacienteRows = await queryAsync(`
        SELECT 
          u.id AS id_paciente,
          CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_completo
        FROM usuarios u
        WHERE u.id = ? AND u.rol = 'usuario'
        LIMIT 1
      `, [idPaciente]);

      if (!pacienteRows.length) continue;

      const [medsRows, condRows, alergRows, citasRows] = await Promise.all([
        queryAsync(`SELECT COUNT(*) AS total FROM Registro_medicamentos WHERE paciente_id = ?`, [idPaciente]),
        queryAsync(`SELECT nivel FROM condicion_medica WHERE id_paciente = ?`, [idPaciente]),
        queryAsync(`SELECT COUNT(*) AS total FROM alergia WHERE id_paciente = ?`, [idPaciente]),
        queryAsync(`SELECT estado, COUNT(*) AS total FROM citas WHERE id_paciente = ? GROUP BY estado`, [idPaciente])
      ]);

      const totalMedicamentos = Number(medsRows?.[0]?.total || 0);
      const totalCondiciones = condRows.length;
      const totalAlergias = Number(alergRows?.[0]?.total || 0);
      const totalCitas = citasRows.reduce((acc, row) => acc + Number(row.total || 0), 0);
      const citasCumplidas = citasRows
        .filter((row) => normalizarEstadoCita(row.estado) === 'cumplida')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
      const citasCanceladas = citasRows
        .filter((row) => normalizarEstadoCita(row.estado) === 'cancelada')
        .reduce((acc, row) => acc + Number(row.total || 0), 0);

      let nivelMax = null;
      if (condRows.some((c) => String(c.nivel || '').toLowerCase() === 'crítica' || String(c.nivel || '').toLowerCase() === 'critica')) {
        nivelMax = 'Crítica';
      } else if (condRows.some((c) => String(c.nivel || '').toLowerCase() === 'moderada')) {
        nivelMax = 'Moderada';
      } else if (condRows.length > 0) {
        nivelMax = 'Leve';
      }

      resultados.push({
        id_paciente: idPaciente,
        nombre_completo: pacienteRows[0].nombre_completo,
        total_medicamentos: totalMedicamentos,
        total_condiciones: totalCondiciones,
        total_alergias: totalAlergias,
        total_citas: totalCitas,
        citas_cumplidas: citasCumplidas,
        citas_canceladas: citasCanceladas,
        nivel_max: nivelMax
      });
    }

    res.json(resultados);
  } catch (error) {
    console.error('Error al comparar pacientes:', error);
    res.status(500).json({ mensaje: 'Error al comparar pacientes' });
  }
});

function formatLocalDateYMD(dateInput) {
  const date = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
// Reporte semanal por paciente (lunes a domingo)
app.get('/reporte-semanal/:id_paciente', async (req, res) => {
  const idPaciente = parseInt(req.params.id_paciente, 10);
  if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
    return res.status(400).json({ mensaje: 'Paciente inválido' });
  }

  const fechaInicio = String(req.query.fecha_inicio || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
    return res.status(400).json({ mensaje: 'fecha_inicio inválida. Use formato YYYY-MM-DD' });
  }

  try {
    const pacienteRows = await queryAsync(`
      SELECT 
        u.id AS id_paciente,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS nombre_completo
      FROM usuarios u
      WHERE u.id = ? AND u.rol = 'usuario'
      LIMIT 1
    `, [idPaciente]);

    if (!pacienteRows.length) {
      return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    }

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 6);
    const fechaFin = formatLocalDateYMD(fin);

    const tomas = await queryAsync(`
      SELECT
        DATE(t.fecha_toma) AS fecha,
        t.nombre_medicamento AS medicamento,
        r.dosis AS dosis,
        t.hora_toma AS horario,
        t.estado
      FROM tomas_medicas t
      LEFT JOIN recetas_medicas r ON r.id = t.id_receta
      WHERE t.id_usuario = ?
        AND DATE(t.fecha_toma) BETWEEN ? AND ?
      ORDER BY t.fecha_toma ASC, t.hora_toma ASC, t.id ASC
    `, [idPaciente, fechaInicio, fechaFin]);

    const porFecha = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const key = formatLocalDateYMD(d);
      porFecha[key] = { programados: 0, tomados: 0, detalle: [] };
    }

    tomas.forEach((toma) => {
      const key = formatLocalDateYMD(toma.fecha);
      if (!porFecha[key]) return;

      porFecha[key].programados += 1;
      if (String(toma.estado || '').toLowerCase() === 'tomada') {
        porFecha[key].tomados += 1;
      }

      porFecha[key].detalle.push({
        medicamento: toma.medicamento || 'Medicamento',
        dosis: toma.dosis || '',
        horario: toma.horario || '',
        tomado: String(toma.estado || '').toLowerCase() === 'tomada'
      });
    });

    const dias = Object.keys(porFecha).sort().map((fecha) => {
      const programados = porFecha[fecha].programados;
      const tomados = porFecha[fecha].tomados;
      const porcentaje = programados > 0 ? Math.round((tomados / programados) * 100) : null;
      return {
        fecha,
        programados,
        tomados,
        porcentaje,
        detalle: porFecha[fecha].detalle
      };
    });

    const totalProgramados = dias.reduce((acc, d) => acc + d.programados, 0);
    const totalTomados = dias.reduce((acc, d) => acc + d.tomados, 0);
    const porcentaje = totalProgramados > 0 ? Math.round((totalTomados / totalProgramados) * 100) : 0;
    const nivelAdherencia = calcularNivelAdherencia(porcentaje);
    const resumen = construirResumenSemanal(porcentaje, totalTomados, totalProgramados);

    res.json({
      paciente: pacienteRows[0],
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      total_programados: totalProgramados,
      total_tomados: totalTomados,
      porcentaje,
      nivel_adherencia: nivelAdherencia,
      resumen,
      dias
    });
  } catch (error) {
    console.error('Error al generar reporte semanal:', error);
    res.status(500).json({ mensaje: 'Error al generar reporte semanal' });
  }
});

// ============================================
// MÓDULO DE EMERGENCIA (Botón SOS + WhatsApp)
// ============================================
//
// Requiere las siguientes variables de entorno (.env):
//   WHATSAPP_TOKEN              -> Token permanente/temporal de Meta (System User Token)
//   WHATSAPP_PHONE_NUMBER_ID    -> Phone Number ID del número de WhatsApp Business
//   WHATSAPP_API_VERSION        -> Ej: v20.0 (opcional, por defecto v20.0)
//   WHATSAPP_DEFAULT_COUNTRY_CODE -> Ej: 504 (Honduras), se antepone si el teléfono
//                                    guardado en BD no incluye código de país
//   WHATSAPP_TEMPLATE_NAME      -> Nombre de la plantilla aprobada en Meta para
//                                  alertas de emergencia (ej: "alerta_emergencia")
//   WHATSAPP_TEMPLATE_LANG      -> Código de idioma de la plantilla (ej: "es" o "es_HN")
//   WHATSAPP_USE_TEMPLATE       -> "true"/"false". Si es "false" se envía texto libre
//                                  (solo funciona si el contacto ya escribió al número
//                                  de negocio en las últimas 24h; Meta lo exige así).
//
// IMPORTANTE (regla de negocio de Meta/WhatsApp):
// Un mensaje enviado por iniciativa del NEGOCIO (como esta alerta de emergencia)
// hacia un contacto que no ha escrito antes, o fuera de la ventana de 24 horas,
// SOLO puede enviarse usando una plantilla ("template") previamente aprobada por Meta.
// Por eso esta implementación envía por defecto un mensaje de plantilla. El texto
// libre (`type: text`) se deja como método alterno solo para pruebas/sandbox.

function normalizarTelefonoWhatsApp(telefono) {
  if (!telefono) return null;
  let soloDigitos = String(telefono).replace(/\D/g, '');
  const codigoPais = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '504';

  // Si el número guardado ya trae código de país (>= 11 dígitos aprox), se respeta.
  if (soloDigitos.length <= 8) {
    soloDigitos = `${codigoPais}${soloDigitos}`;
  }
  return soloDigitos;
}

async function enviarAlertaWhatsApp({ telefono, nombrePaciente, tipoActivacion, lat, lng }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';
  const usarPlantilla = String(process.env.WHATSAPP_USE_TEMPLATE || 'true').toLowerCase() !== 'false';

  if (!token || !phoneNumberId) {
    return { ok: false, telefono, error: 'WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados en el servidor' };
  }

  const numeroDestino = normalizarTelefonoWhatsApp(telefono);
  if (!numeroDestino) {
    return { ok: false, telefono, error: 'Número de contacto inválido' };
  }

  const enlaceUbicacion = (lat != null && lng != null)
    ? `https://maps.google.com/?q=${lat},${lng}`
    : 'Ubicación no disponible';

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  let body;
  if (usarPlantilla) {
    // La plantilla debe existir y estar APROBADA en Meta Business Manager.
    // Se asume una plantilla con 3 variables: {{1}} nombre paciente, {{2}} tipo de activación, {{3}} enlace ubicación.
    body = {
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME || 'alerta_emergencia',
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'es' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: nombrePaciente || 'Paciente SISCOM' },
              { type: 'text', text: tipoActivacion || 'botón' },
              { type: 'text', text: enlaceUbicacion }
            ]
          }
        ]
      }
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'text',
      text: {
        body: `🚨 ALERTA DE EMERGENCIA SISCOM 🚨\n${nombrePaciente || 'Un paciente'} activó el protocolo de emergencia (${tipoActivacion || 'botón'}).\nUbicación: ${enlaceUbicacion}`
      }
    };
  }

  try {
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error de WhatsApp API:', JSON.stringify(data));
      return { ok: false, telefono: numeroDestino, error: data?.error?.message || 'Error al enviar WhatsApp' };
    }

    return { ok: true, telefono: numeroDestino, messageId: data?.messages?.[0]?.id || null };
  } catch (error) {
    console.error('Error de red al enviar WhatsApp:', error.message || error);
    return { ok: false, telefono: numeroDestino, error: error.message || 'Error de red' };
  }
}

// Activar protocolo de emergencia: registra el evento y notifica por WhatsApp
app.post('/activarEmergencia', async (req, res) => {
  const { id_usuario, tipo_activacion, ubicacion_lat, ubicacion_lng } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ ok: false, mensaje: 'id_usuario es requerido' });
  }

  const sqlInsert = `
    INSERT INTO historial_emergencias (id_usuario, tipo_activacion, ubicacion_lat, ubicacion_lng, fecha_hora, estado)
    VALUES (?, ?, ?, ?, NOW(), 'activa')
  `;

  db.query(sqlInsert, [id_usuario, tipo_activacion || 'boton', ubicacion_lat || null, ubicacion_lng || null], (err, resultInsert) => {
    if (err) {
      console.error('Error al registrar emergencia:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al registrar la emergencia' });
    }

    const idEmergencia = resultInsert.insertId;

    // Obtener nombre del paciente
    db.query('SELECT nombres, apellidos FROM usuarios WHERE id = ?', [id_usuario], async (errUsuario, resultUsuario) => {
      const nombrePaciente = (!errUsuario && resultUsuario.length > 0)
        ? `${resultUsuario[0].nombres} ${resultUsuario[0].apellidos}`.trim()
        : 'Paciente SISCOM';

      // Obtener contactos de emergencia del paciente
      db.query(
        'SELECT * FROM contactos_emergencia WHERE id_usuario = ? ORDER BY prioridad ASC',
        [id_usuario],
        async (errContactos, contactos) => {
          if (errContactos) {
            console.error('Error al obtener contactos de emergencia:', errContactos);
          }

          const listaContactos = contactos || [];
          let resultadosEnvio = [];

          if (listaContactos.length > 0) {
            resultadosEnvio = await Promise.all(
              listaContactos.map(contacto => enviarAlertaWhatsApp({
                telefono: contacto.telefono,
                nombrePaciente,
                tipoActivacion: tipo_activacion || 'boton',
                lat: ubicacion_lat,
                lng: ubicacion_lng
              }))
            );
          }

          const exitosos = resultadosEnvio.filter(r => r.ok).length;
          const total = resultadosEnvio.length;
          const notas = total === 0
            ? 'Sin contactos de emergencia registrados. No se envió ninguna alerta.'
            : `Notificados ${exitosos}/${total} contactos por WhatsApp.`;

          db.query('UPDATE historial_emergencias SET notas = ? WHERE id = ?', [notas, idEmergencia], () => {});

          return res.json({
            ok: true,
            mensaje: 'Emergencia activada',
            id_emergencia: idEmergencia,
            notificaciones: resultadosEnvio
          });
        }
      );
    });
  });
});

// Listar contactos de emergencia de un usuario
app.get('/contactosEmergencia/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  db.query(
    'SELECT * FROM contactos_emergencia WHERE id_usuario = ? ORDER BY prioridad ASC',
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('Error al obtener contactos de emergencia:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener contactos de emergencia' });
      }
      res.json(results);
    }
  );
});

// Historial de emergencias de un usuario
app.get('/historialEmergencias/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  db.query(
    'SELECT * FROM historial_emergencias WHERE id_usuario = ? ORDER BY fecha_hora DESC',
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('Error al obtener historial de emergencias:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener historial de emergencias' });
      }
      res.json(results);
    }
  );
});

// Cancelar una emergencia activa
app.put('/cancelarEmergencia/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE historial_emergencias SET estado = 'cancelada' WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error('Error al cancelar emergencia:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al cancelar la emergencia' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, mensaje: 'Emergencia no encontrada' });
      }
      res.json({ ok: true, mensaje: 'Emergencia cancelada' });
    }
  );
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando correctamente' });
});

// ============================================
// RUTA DE MIGRACIÓN - Actualizar tabla citas
// ============================================
app.get('/migrar-citas', (req, res) => {
  // Primero verificar qué columnas existen
  const checkColumnsSql = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas'
  `;
  
  db.query(checkColumnsSql, (err, existingColumns) => {
    if (err) {
      console.error('Error al verificar columnas existentes:', err);
      return res.status(500).json({ 
        mensaje: 'Error al verificar estructura de la tabla', 
        error: err.message 
      });
    }

    const existingColumnNames = existingColumns.map(col => col.COLUMN_NAME);
    console.log('Columnas existentes:', existingColumnNames);

    // Definir las columnas que necesitamos agregar
    const columnsToAdd = [
      { name: 'doctor', sql: `ALTER TABLE citas ADD COLUMN doctor VARCHAR(255) NULL AFTER anticipacion_min` },
      { name: 'especialidad', sql: `ALTER TABLE citas ADD COLUMN especialidad VARCHAR(255) NULL AFTER doctor` },
      { name: 'ubicacion', sql: `ALTER TABLE citas ADD COLUMN ubicacion VARCHAR(255) NULL AFTER especialidad` },
      { name: 'estado', sql: `ALTER TABLE citas ADD COLUMN estado VARCHAR(50) NULL DEFAULT 'programada' AFTER ubicacion` },
      { name: 'notas', sql: `ALTER TABLE citas ADD COLUMN notas TEXT NULL AFTER estado` }
    ].filter(col => !existingColumnNames.includes(col.name));

    if (columnsToAdd.length === 0) {
      return res.json({ 
        mensaje: '✅ Todas las columnas ya existen en la tabla citas',
        columnas_agregadas: 0,
        nota: 'No se requiere ninguna migración'
      });
    }

    console.log(`Agregando ${columnsToAdd.length} columnas faltantes...`);

    let completed = 0;
    let errors = [];
    let added = [];

    columnsToAdd.forEach((column) => {
      db.query(column.sql, (err, result) => {
        completed++;
        
        if (err) {
          console.error(`Error al agregar columna ${column.name}:`, err.message);
          errors.push({ columna: column.name, error: err.message });
        } else {
          console.log(`✅ Columna '${column.name}' agregada correctamente`);
          added.push(column.name);
        }

        // Cuando todas las consultas terminen
        if (completed === columnsToAdd.length) {
          if (errors.length === 0) {
            res.json({ 
              mensaje: '✅ Migración completada exitosamente', 
              columnas_agregadas: added.length,
              columnas: added,
              nota: 'La tabla citas ahora tiene todas las columnas necesarias'
            });
          } else {
            res.status(500).json({ 
              mensaje: '⚠️ Migración completada con algunos errores', 
              columnas_agregadas: added.length,
              columnas: added,
              errores: errors,
              nota: 'Algunas columnas no pudieron ser agregadas'
            });
          }
        }
      });
    });
  });
});


// ============================================
// RUTA PARA ELIMINAR FOREIGN KEY CONSTRAINT
// ============================================
app.get('/fix-citas-foreign-key', (req, res) => {
  // Obtener información sobre las foreign keys de la tabla citas
  const getFkSql = `
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'citas' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `;
  
  db.query(getFkSql, (err, constraints) => {
    if (err) {
      console.error('Error al obtener foreign keys:', err);
      return res.status(500).json({ 
        mensaje: 'Error al verificar restricciones', 
        error: err.message 
      });
    }

    if (constraints.length === 0) {
      return res.json({ 
        mensaje: '✅ No hay foreign key constraints que eliminar',
        nota: 'La tabla citas ya permite guardar citas sin validación de paciente'
      });
    }

    console.log('Foreign keys encontradas:', constraints.map(c => c.CONSTRAINT_NAME));

    let completed = 0;
    let errors = [];
    let removed = [];

    constraints.forEach((constraint) => {
      const dropSql = `ALTER TABLE citas DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`;
      
      db.query(dropSql, (err, result) => {
        completed++;
        
        if (err) {
          console.error(`Error al eliminar constraint ${constraint.CONSTRAINT_NAME}:`, err.message);
          errors.push({ constraint: constraint.CONSTRAINT_NAME, error: err.message });
        } else {
          console.log(`✅ Foreign key '${constraint.CONSTRAINT_NAME}' eliminada correctamente`);
          removed.push(constraint.CONSTRAINT_NAME);
        }

        // Cuando todas las consultas terminen
        if (completed === constraints.length) {
          if (errors.length === 0) {
            res.json({ 
              mensaje: '✅ Restricciones eliminadas exitosamente', 
              constraints_eliminadas: removed.length,
              constraints: removed,
              nota: 'Ahora puedes guardar citas sin necesidad de que el paciente exista previamente'
            });
          } else {
            res.status(500).json({ 
              mensaje: '⚠️ Algunas restricciones no pudieron eliminarse', 
              constraints_eliminadas: removed.length,
              constraints: removed,
              errores: errors,
              nota: 'Revisa los errores para más detalles'
            });
          }
        }
      });
    });
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(3000, () => {

  console.log('Servidor corriendo en http://localhost:3000');
  console.log('CORS habilitado para todas las solicitudes');
});