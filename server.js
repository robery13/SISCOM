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

    // Flexibilizar la columna "rol" de usuarios: si fue creada como ENUM con una
    // lista fija de valores (usuario/empleado/administrador), impide asignar
    // cualquier rol nuevo creado desde Gestión de Roles (ej. "evaluacion") y
    // provoca un error de MySQL al registrar el usuario. Se convierte a VARCHAR
    // para que acepte cualquier rol dado de alta dinámicamente.
    ensureUsuariosRolFlexible();

    // Asegurar columna requiere_cambio_password en usuarios (seguridad: forzar cambio
    // de contrasena en el primer inicio de sesion cuando el administrador crea el
    // usuario con una contrasena generica/temporal)
    ensureUsuariosColumn('requiere_cambio_password', "ALTER TABLE usuarios ADD COLUMN requiere_cambio_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password");

    // Asegurar columna tipo_sangre en usuarios (HU-22: Agregar tipo de sangre)
    ensureUsuariosColumn('tipo_sangre', "ALTER TABLE usuarios ADD COLUMN tipo_sangre VARCHAR(5) NULL AFTER telefono");

    // Asegurar columnas de Ficha Médica en usuarios (operaciones, alergias, enfermedades cronicas, tatuajes, otras enfermedades)
    ensureUsuariosColumn('operaciones_realizadas', "ALTER TABLE usuarios ADD COLUMN operaciones_realizadas TEXT NULL AFTER tipo_sangre");
    ensureUsuariosColumn('alergias', "ALTER TABLE usuarios ADD COLUMN alergias TEXT NULL AFTER operaciones_realizadas");
    ensureUsuariosColumn('enfermedades_cronicas', "ALTER TABLE usuarios ADD COLUMN enfermedades_cronicas TEXT NULL AFTER alergias");
    ensureUsuariosColumn('tatuajes', "ALTER TABLE usuarios ADD COLUMN tatuajes TEXT NULL AFTER enfermedades_cronicas");
    ensureUsuariosColumn('otras_enfermedades', "ALTER TABLE usuarios ADD COLUMN otras_enfermedades TEXT NULL AFTER tatuajes");

    // Sección 5 - Módulo de pacientes: completar la ficha propia del paciente
    // (edad vía fecha de nacimiento, uso de silla de ruedas). El resto de la
    // ficha (tipo de sangre, alergias, condiciones, etc.) ya existía arriba.
    ensureUsuariosColumn('fecha_nacimiento', "ALTER TABLE usuarios ADD COLUMN fecha_nacimiento DATE NULL AFTER otras_enfermedades");
    ensureUsuariosColumn('usa_silla_ruedas', "ALTER TABLE usuarios ADD COLUMN usa_silla_ruedas TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_nacimiento");

    // Sección 5.2 - fecha de inicio/fin de tratamiento en cada receta, para no
    // tener medicamentos "para siempre" cuando en realidad son de unos días.
    ensureTableColumn('recetas_medicas', 'fecha_inicio', "ALTER TABLE recetas_medicas ADD COLUMN fecha_inicio DATE NULL AFTER frecuencia");
    ensureTableColumn('recetas_medicas', 'fecha_fin', "ALTER TABLE recetas_medicas ADD COLUMN fecha_fin DATE NULL AFTER fecha_inicio");

    // Crear tabla contactos_emergencia si no existe (HU-21: Agregar contactos de emergencia)
    const createContactosEmergenciaSql = `
      CREATE TABLE IF NOT EXISTS contactos_emergencia (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        nombre_contacto VARCHAR(150) NOT NULL,
        relacion VARCHAR(100) NULL,
        telefono VARCHAR(20) NOT NULL,
        prioridad INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_contactos_usuario (id_usuario)
      )
    `;
    db.query(createContactosEmergenciaSql, (err) => {
      if (err) {
        console.error('Error al crear tabla contactos_emergencia:', err);
      } else {
        console.log('Tabla contactos_emergencia verificada/creada correctamente');
      }
    });

    // Crear tabla accesos_usuarios si no existe (registro real de inicios de sesión
    // para poder graficar "Acceso de Usuarios" en el dashboard con datos reales)
    const createAccesosUsuariosSql = `
      CREATE TABLE IF NOT EXISTS accesos_usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        email VARCHAR(255) NULL,
        rol VARCHAR(50) NULL,
        fecha_hora DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_accesos_usuario (id_usuario),
        INDEX idx_accesos_fecha (fecha_hora)
      )
    `;
    db.query(createAccesosUsuariosSql, (err) => {
      if (err) {
        console.error('Error al crear tabla accesos_usuarios:', err);
      } else {
        console.log('Tabla accesos_usuarios verificada/creada correctamente');
      }
    });

    // ===== Fase A: Parametrización general (nada de valores fijos en código) =====

    // Tabla de dominios de correo permitidos (antes era un Set fijo en el código)
    const createDominiosPermitidosSql = `
      CREATE TABLE IF NOT EXISTS dominios_correo_permitidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dominio VARCHAR(191) NOT NULL UNIQUE,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createDominiosPermitidosSql, (err) => {
      if (err) {
        console.error('Error al crear tabla dominios_correo_permitidos:', err);
        return;
      }
      console.log('Tabla dominios_correo_permitidos verificada/creada correctamente');

      const dominiosSemilla = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com'];
      db.query('SELECT COUNT(*) AS total FROM dominios_correo_permitidos', (errCount, rows) => {
        if (errCount) { console.error('Error al verificar dominios semilla:', errCount); return; }
        if (rows[0].total > 0) { cargarDominiosPermitidosCache(); return; }
        const valores = dominiosSemilla.map(d => [d]);
        db.query('INSERT INTO dominios_correo_permitidos (dominio) VALUES ?', [valores], (errSeed) => {
          if (errSeed) console.error('Error al insertar dominios semilla:', errSeed);
          cargarDominiosPermitidosCache();
        });
      });
    });

    // Tabla de roles (antes eran valores fijos "usuario/empleado/administrador" en el <select>)
    const createRolesSql = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_rol VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(255) NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createRolesSql, (err) => {
      if (err) {
        console.error('Error al crear tabla roles:', err);
        return;
      }
      console.log('Tabla roles verificada/creada correctamente');

      const rolesSemilla = [
        ['administrador', 'Acceso total al sistema'],
        ['empleado', 'Personal operativo (farmacia / inventario)'],
        ['usuario', 'Paciente o cuidador registrado desde el portal público']
      ];
      db.query('SELECT COUNT(*) AS total FROM roles', (errCount, rows) => {
        if (errCount) { console.error('Error al verificar roles semilla:', errCount); return; }
        if (rows[0].total > 0) return;
        db.query('INSERT INTO roles (nombre_rol, descripcion) VALUES ?', [rolesSemilla], (errSeed) => {
          if (errSeed) console.error('Error al insertar roles semilla:', errSeed);
        });
      });
    });

    // Tabla de parámetros generales del sistema (reglas de negocio configurables,
    // por ejemplo el umbral de "stock crítico" que antes era un "if" fijo en el código)
    const createParametrosSql = `
      CREATE TABLE IF NOT EXISTS parametros_sistema (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor VARCHAR(255) NOT NULL,
        descripcion VARCHAR(255) NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'numero',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    db.query(createParametrosSql, (err) => {
      if (err) {
        console.error('Error al crear tabla parametros_sistema:', err);
        return;
      }
      console.log('Tabla parametros_sistema verificada/creada correctamente');

      const parametrosSemilla = [
        ['stock_critico_umbral', '5', 'Cantidad en inventario a partir de la cual un medicamento se marca como "Stock crítico"', 'numero'],
        ['stock_bajo_umbral', '10', 'Cantidad en inventario a partir de la cual un medicamento se marca como "Stock bajo"', 'numero']
      ];
      db.query('SELECT COUNT(*) AS total FROM parametros_sistema', (errCount, rows) => {
        if (errCount) { console.error('Error al verificar parámetros semilla:', errCount); return; }
        if (rows[0].total > 0) return;
        db.query('INSERT INTO parametros_sistema (clave, valor, descripcion, tipo) VALUES ?', [parametrosSemilla], (errSeed) => {
          if (errSeed) console.error('Error al insertar parámetros semilla:', errSeed);
        });
      });

      // Sección 5.4 - Sistema de recompensas: la lic pidió poder
      // ocultarlo mientras no esté completo. Se agrega este parámetro aparte
      // (no depende del bloque "solo si la tabla está vacía" de arriba) para
      // que también aparezca en instalaciones que ya tenían parámetros.
      db.query("SELECT id FROM parametros_sistema WHERE clave = 'mostrar_recompensas'", (errCheck, filas) => {
        if (errCheck) { console.error('Error al verificar parámetro mostrar_recompensas:', errCheck); return; }
        if (filas.length > 0) return;
        db.query(
          'INSERT INTO parametros_sistema (clave, valor, descripcion, tipo) VALUES (?, ?, ?, ?)',
          ['mostrar_recompensas', '0', 'Muestra u oculta el sistema de recompensas en la interfaz del paciente (0 = oculto, 1 = visible)', 'booleano'],
          (errInsertRecompensas) => {
            if (errInsertRecompensas) console.error('Error al insertar parámetro mostrar_recompensas:', errInsertRecompensas);
          }
        );
      });
    });

    // ===== Fase B: Módulo de Seguridad (permisos, bitácora) =====

    const createPermisosSql = `
      CREATE TABLE IF NOT EXISTS permisos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_permiso VARCHAR(100) NOT NULL UNIQUE,
        descripcion VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createPermisosSql, (err) => {
      if (err) {
        console.error('Error al crear tabla permisos:', err);
        return;
      }
      console.log('Tabla permisos verificada/creada correctamente');

      const createRolesPermisosSql = `
        CREATE TABLE IF NOT EXISTS roles_permisos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre_rol VARCHAR(50) NOT NULL,
          id_permiso INT NOT NULL,
          UNIQUE KEY uq_rol_permiso (nombre_rol, id_permiso),
          CONSTRAINT fk_roles_permisos_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
        )
      `;
      db.query(createRolesPermisosSql, (err2) => {
        if (err2) {
          console.error('Error al crear tabla roles_permisos:', err2);
          return;
        }
        console.log('Tabla roles_permisos verificada/creada correctamente');
      });

      // Los nombres de los permisos son iguales a los módulos del sistema tal
      // como aparecen en el menú (sin sufijo ".gestionar"), para que sea claro
      // qué parte del sistema desbloquea cada permiso. Incluye los módulos del
      // panel de administrador y también los del panel de cuidador
      // (Registro de Tomas, Historial de Tomas, Estadísticas), para que el
      // menú del cuidador y el de cualquier rol nuevo se arme según estos
      // mismos permisos.
      const permisosSemilla = [
        ['Usuarios', 'Crear, editar y eliminar usuarios'],
        ['Roles', 'Crear y editar roles'],
        ['Permisos', 'Asignar permisos a roles'],
        ['Medicamentos', 'Crear y editar medicamentos'],
        ['Inventario', 'Administrar inventario y pedidos de farmacia'],
        ['Citas Médicas', 'Administrar citas médicas'],
        ['Parámetros del Sistema', 'Editar parámetros generales del sistema'],
        ['Bitácora', 'Consultar la bitácora de auditoría'],
        ['Backup y Restore', 'Generar y restaurar copias de seguridad'],
        ['Dominios de Correo', 'Administrar los dominios de correo permitidos para registrarse'],
        ['Registro de Tomas', 'Registrar las tomas de medicamentos de los pacientes'],
        ['Historial de Tomas', 'Consultar el historial de tomas de los pacientes'],
        ['Estadísticas', 'Consultar reportes y estadísticas']
      ];

      // Módulos que hoy ve el rol "empleado" (cuidador) en cuidador_backend.html.
      // Se le asignan por defecto la primera vez, para que ningún cuidador
      // pierda acceso a lo que ya usaba al activar el control por permisos.
      const modulosBasePorRol = {
        empleado: ['Medicamentos', 'Registro de Tomas', 'Historial de Tomas', 'Citas Médicas', 'Estadísticas']
      };

      // Migrar instalaciones existentes que ya tenían los permisos con el
      // nombre viejo (ej. "usuarios.gestionar") al nuevo nombre igual al del
      // módulo (ej. "Usuarios"). Solo renombra la fila; conserva su id, por lo
      // que las asignaciones ya hechas en roles_permisos no se pierden.
      const renombresLegado = [
        ['usuarios.gestionar', 'Usuarios'],
        ['roles.gestionar', 'Roles'],
        ['permisos.gestionar', 'Permisos'],
        ['medicamentos.gestionar', 'Medicamentos'],
        ['inventario.gestionar', 'Inventario'],
        ['citas.gestionar', 'Citas Médicas'],
        ['parametros.gestionar', 'Parámetros del Sistema'],
        ['bitacora.ver', 'Bitácora'],
        ['backup.gestionar', 'Backup y Restore']
      ];

      (async () => {
        try {
          for (const [nombreViejo, nombreNuevo] of renombresLegado) {
            try {
              await queryAsync('UPDATE permisos SET nombre_permiso = ? WHERE nombre_permiso = ?', [nombreNuevo, nombreViejo]);
            } catch (errRen) {
              if (errRen.code !== 'ER_DUP_ENTRY') console.error(`Error al migrar permiso "${nombreViejo}" a "${nombreNuevo}":`, errRen);
            }
          }

          // Inserta cada permiso solo si todavía no existe (por nombre), en vez
          // de solo sembrar cuando la tabla está vacía. Así, instalaciones que
          // ya tenían permisos también reciben los módulos nuevos (ej. cuando
          // se agrega "Estadísticas" más adelante).
          for (const [nombre, descripcion] of permisosSemilla) {
            await queryAsync('INSERT IGNORE INTO permisos (nombre_permiso, descripcion) VALUES (?, ?)', [nombre, descripcion]);
          }

          const filasPermisos = await queryAsync('SELECT id, nombre_permiso FROM permisos');
          const idPorNombre = {};
          filasPermisos.forEach(f => { idPorNombre[f.nombre_permiso] = f.id; });

          // El rol "administrador" siempre tiene todos los módulos existentes
          // (incluye los que se agreguen en el futuro).
          for (const permiso of filasPermisos) {
            await queryAsync('INSERT IGNORE INTO roles_permisos (nombre_rol, id_permiso) VALUES (?, ?)', ['administrador', permiso.id]);
          }

          // A cada rol de modulosBasePorRol se le asignan sus módulos por
          // defecto solo la primera vez (si ya tiene permisos configurados, no
          // se toca lo que el administrador ya haya definido).
          for (const [nombreRol, modulos] of Object.entries(modulosBasePorRol)) {
            const [{ total }] = await queryAsync('SELECT COUNT(*) AS total FROM roles_permisos WHERE nombre_rol = ?', [nombreRol]);
            if (total > 0) continue;
            for (const nombreModulo of modulos) {
              const idPermiso = idPorNombre[nombreModulo];
              if (!idPermiso) continue;
              await queryAsync('INSERT IGNORE INTO roles_permisos (nombre_rol, id_permiso) VALUES (?, ?)', [nombreRol, idPermiso]);
            }
          }
        } catch (errInit) {
          console.error('Error al inicializar permisos y asignaciones base:', errInit);
        }
      })();
    });

    const createBitacoraSql = `
      CREATE TABLE IF NOT EXISTS bitacora (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NULL,
        email VARCHAR(255) NULL,
        rol VARCHAR(50) NULL,
        accion VARCHAR(100) NOT NULL,
        detalle VARCHAR(500) NULL,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(createBitacoraSql, (err) => {
      if (err) {
        console.error('Error al crear tabla bitacora:', err);
        return;
      }
      console.log('Tabla bitacora verificada/creada correctamente');
    });
  }
});

// Registra una acción en la bitácora de auditoría. No detiene el flujo
// principal si falla: la bitácora nunca debe tumbar una operación real.
function registrarBitacora(req, accion, detalle) {
  const usuario = req && req.user ? req.user : {};
  db.query(
    'INSERT INTO bitacora (id_usuario, email, rol, accion, detalle) VALUES (?, ?, ?, ?, ?)',
    [usuario.id || null, usuario.email || null, usuario.rol || null, accion, detalle || null],
    (err) => {
      if (err) console.error('Error al registrar en bitácora:', err);
    }
  );
}

function ensureUsuariosRolFlexible() {
  db.query('SHOW COLUMNS FROM usuarios LIKE ?', ['rol'], (err, results) => {
    if (err) {
      console.error('Error al verificar columna rol en usuarios:', err);
      return;
    }
    if (results.length === 0) return;

    const tipoColumna = String(results[0].Type || '').toLowerCase();
    if (!tipoColumna.startsWith('enum')) return; // ya acepta cualquier valor

    db.query('ALTER TABLE usuarios MODIFY COLUMN rol VARCHAR(50) NULL', (errAlter) => {
      if (errAlter) {
        console.error('Error al flexibilizar columna rol en usuarios:', errAlter);
      } else {
        console.log('Columna rol en usuarios convertida de ENUM a VARCHAR(50): ya acepta roles nuevos creados en Gestión de Roles');
      }
    });
  });
}

function ensureUsuariosColumn(columnName, alterSql) {
  db.query('SHOW COLUMNS FROM usuarios LIKE ?', [columnName], (err, results) => {
    if (err) {
      console.error(`Error al verificar columna ${columnName} en usuarios:`, err);
      return;
    }

    if (results.length > 0) {
      return;
    }

    db.query(alterSql, (errAlter) => {
      if (errAlter) {
        console.error(`Error al agregar columna ${columnName} en usuarios:`, errAlter);
      } else {
        console.log(`Columna ${columnName} agregada a usuarios correctamente`);
      }
    });
  });
}
function ensureTableColumn(tableName, columnName, alterSql) {
  db.query('SHOW COLUMNS FROM ?? LIKE ?', [tableName, columnName], (err, results) => {
    if (err) {
      console.error(`Error al verificar columna ${columnName} en ${tableName}:`, err);
      return;
    }

    if (results.length > 0) {
      return;
    }

    db.query(alterSql, (errAlter) => {
      if (errAlter) {
        console.error(`Error al agregar columna ${columnName} en ${tableName}:`, errAlter);
      } else {
        console.log(`Columna ${columnName} agregada a ${tableName} correctamente`);
      }
    });
  });
}

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



// Caché en memoria de dominios permitidos, cargada desde la tabla
// dominios_correo_permitidos. Se recarga al iniciar el servidor y cada vez
// que el administrador crea/edita/elimina un dominio desde el mantenimiento.
// Así ningún dominio queda "hardcodeado": todo sale de la base de datos.
let dominiosPermitidosCache = new Set();

function cargarDominiosPermitidosCache() {
  db.query('SELECT dominio FROM dominios_correo_permitidos WHERE activo = 1', (err, rows) => {
    if (err) {
      console.error('Error al cargar caché de dominios permitidos:', err);
      return;
    }
    dominiosPermitidosCache = new Set(rows.map(r => String(r.dominio || '').toLowerCase()));
    console.log(`Caché de dominios permitidos actualizada (${dominiosPermitidosCache.size} dominios activos)`);
  });
}

function esCorreoDominioPermitido(email) {
  const emailRegex = /^(?=.{6,254}$)(?=.{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;
  const correo = String(email || '').trim().toLowerCase();
  if (!emailRegex.test(correo)) return false;

  const dominio = correo.split('@')[1] || '';
  return dominiosPermitidosCache.has(dominio);
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

    // Registrar el acceso real (para el gráfico "Acceso de Usuarios" del dashboard)
    db.query(
      'INSERT INTO accesos_usuarios (id_usuario, email, rol, fecha_hora) VALUES (?, ?, ?, NOW())',
      [usuario.id, usuario.email, usuario.rol || null],
      (errAcceso) => {
        if (errAcceso) console.error('Error al registrar acceso de usuario:', errAcceso);
      }
    );
    registrarBitacora({ user: { id: usuario.id, email: usuario.email, rol: usuario.rol } }, 'login', 'Inicio de sesión exitoso');

    const requiereCambioPassword = !!usuario.requiere_cambio_password;
    // No enviar el hash de la contraseña al frontend
    const usuarioSeguro = { ...usuario };
    delete usuarioSeguro.password;

    // Si todo est� correcto
    res.status(200).json({
      ok: true,
      mensaje: 'Inicio de sesi�n exitoso',
      usuario: usuarioSeguro,
      requiereCambioPassword,
      token
    });
  });
});
// Historial real de accesos (para graficar "Acceso de Usuarios" en el dashboard)
app.get('/accesos-usuarios', (req, res) => {
  const sql = 'SELECT id_usuario, email, rol, fecha_hora FROM accesos_usuarios ORDER BY fecha_hora ASC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener accesos_usuarios:', err);
      return res.status(500).json({ mensaje: 'Error al cargar historial de accesos' });
    }
    res.json(results);
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
// PERFIL DEL USUARIO AUTENTICADO (cualquier rol)
// Cambio de contraseña propio + edición de datos personales.
// El correo NUNCA se puede editar aquí: es el dato de acceso.
// ============================================

// Cambiar la propia contraseña.
// Se usa tanto para el cambio obligatorio en el primer inicio de sesión
// (cuando el administrador asignó una contraseña genérica) como desde la
// pantalla de "Perfil" para un cambio voluntario posterior.
app.post('/cambiar-password', verificarRol(), async (req, res) => {
  const { passwordActual, passwordNueva } = req.body || {};
  const actual = String(passwordActual || '').trim();
  const nueva = String(passwordNueva || '').trim();

  if (!actual || !nueva) {
    return res.status(400).json({ ok: false, mensaje: 'Debes indicar tu contraseña actual y la nueva contraseña.' });
  }

  if (nueva.length < 8) {
    return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }

  db.query('SELECT id, password FROM usuarios WHERE id = ? LIMIT 1', [req.user.id], async (err, results) => {
    if (err) {
      return res.status(500).json({ ok: false, mensaje: 'Error al verificar el usuario.' });
    }
    if (!results.length) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }

    const usuario = results[0];
    const actualValida = await bcrypt.compare(actual, usuario.password);
    if (!actualValida) {
      return res.status(401).json({ ok: false, mensaje: 'La contraseña actual es incorrecta.' });
    }

    // No permitir reutilizar la misma contraseña (incluye la contraseña
    // genérica/temporal que haya asignado el administrador).
    const esLaMisma = await bcrypt.compare(nueva, usuario.password);
    if (esLaMisma) {
      return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nueva, saltRounds);

    db.query(
      'UPDATE usuarios SET password = ?, requiere_cambio_password = 0 WHERE id = ?',
      [hashedPassword, usuario.id],
      (errUpdate) => {
        if (errUpdate) {
          return res.status(500).json({ ok: false, mensaje: 'Error al actualizar la contraseña.' });
        }
        registrarBitacora(req, 'usuarios.cambiar_password', `Usuario id=${usuario.id} cambió su propia contraseña`);
        return res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente.' });
      }
    );
  });
});

// Obtener los datos de perfil del usuario autenticado (cualquier rol)
app.get('/perfil', verificarRol(), (req, res) => {
  const sql = 'SELECT id, nombres, apellidos, identidad, telefono, email, rol, requiere_cambio_password FROM usuarios WHERE id = ? LIMIT 1';
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      return res.status(500).json({ ok: false, mensaje: 'Error al cargar tu perfil.' });
    }
    if (!results.length) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });
    }
    return res.json({ ok: true, usuario: results[0] });
  });
});

// Actualizar los datos personales del usuario autenticado (cualquier rol).
// Solo nombres, apellidos, identidad y teléfono. El correo (email) y el rol
// nunca se aceptan aquí, aunque vengan en el body.
app.put('/perfil', verificarRol(), (req, res) => {
  const { nombres, apellidos, identidad, telefono } = req.body || {};

  if (!nombres || !apellidos || !identidad || !telefono) {
    return res.status(400).json({ ok: false, mensaje: 'Todos los campos son obligatorios.' });
  }

  // Evitar que la identidad quede duplicada con la de otro usuario
  db.query('SELECT id FROM usuarios WHERE identidad = ? AND id != ?', [identidad, req.user.id], (errDup, dup) => {
    if (errDup) {
      return res.status(500).json({ ok: false, mensaje: 'Error al verificar datos duplicados.' });
    }
    if (dup.length > 0) {
      return res.status(400).json({ ok: false, mensaje: 'Ya existe otro usuario registrado con esa identidad.' });
    }

    const sql = 'UPDATE usuarios SET nombres = ?, apellidos = ?, identidad = ?, telefono = ? WHERE id = ?';
    db.query(sql, [nombres, apellidos, identidad, telefono, req.user.id], (err, result) => {
      if (err) {
        return res.status(500).json({ ok: false, mensaje: 'Error al actualizar tu perfil.' });
      }
      registrarBitacora(req, 'usuarios.editar_perfil_propio', `Usuario id=${req.user.id} actualizó sus datos personales`);
      return res.json({ ok: true, mensaje: 'Perfil actualizado correctamente.' });
    });
  });
});

// Módulos (permisos) habilitados para el rol del usuario que inició sesión.
// Pensado para roles nuevos creados en Gestión de Roles (ej. "evaluacion"):
// el front usa esta lista para dibujar solo los botones/módulos del menú que
// correspondan a los permisos marcados para ese rol, sin necesitar un archivo
// de interfaz aparte por cada rol nuevo (como si fuera una vista tipo
// cuidador, pero armada dinámicamente según los permisos).
// No requiere el permiso "Permisos": cualquier sesión válida puede consultar
// sus propios módulos habilitados.
app.get('/mis-permisos', verificarRol(), (req, res) => {
  const userRol = req.user.rol;

  // El administrador siempre ve todos los módulos existentes.
  if (userRol === 'administrador') {
    return db.query('SELECT nombre_permiso FROM permisos ORDER BY nombre_permiso ASC', (err, rows) => {
      if (err) {
        console.error('Error al obtener módulos del administrador:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener tus módulos habilitados' });
      }
      res.json({ ok: true, rol: userRol, modulos: rows.map(r => r.nombre_permiso) });
    });
  }

  db.query(
    `SELECT p.nombre_permiso FROM roles_permisos rp
     INNER JOIN permisos p ON p.id = rp.id_permiso
     WHERE rp.nombre_rol = ?
     ORDER BY p.nombre_permiso ASC`,
    [userRol],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener módulos habilitados:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener tus módulos habilitados' });
      }
      res.json({ ok: true, rol: userRol, modulos: rows.map(r => r.nombre_permiso) });
    }
  );
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

      // Si no se especifican roles, solo se exige sesión válida (autoservicio:
      // /perfil, /cambiar-password). Esto es necesario porque los roles ahora
      // son dinámicos (Fase A) y no tendría sentido una lista fija aquí.
      const exigeRoles = Array.isArray(rolesPermitidos) && rolesPermitidos.length > 0;
      if (exigeRoles && !rolesPermitidos.includes(userRol)) {
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

/**
 * Middleware para verificar si el rol del usuario tiene un permiso concreto
 * asignado en Gestión de Usuarios (Seguridad > Permisos). El nombre del
 * permiso es igual al nombre del módulo (ej. "Usuarios", "Roles").
 * El rol "administrador" siempre pasa, para que nunca pueda quedar bloqueado
 * de su propio panel si alguien le quita el permiso por error.
 * @param {string} nombrePermiso
 */
function verificarPermiso(nombrePermiso) {
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

    db.query('SELECT rol FROM usuarios WHERE id = ?', [session.userId], (err, results) => {
      if (err) {
        console.error('Error al verificar permiso:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al verificar permisos' });
      }

      if (results.length === 0) {
        return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
      }

      const userRol = results[0].rol;

      req.user = {
        id: session.userId,
        email: session.email,
        rol: userRol
      };

      if (userRol === 'administrador') {
        return next();
      }

      db.query(
        `SELECT rp.id FROM roles_permisos rp
         INNER JOIN permisos p ON p.id = rp.id_permiso
         WHERE rp.nombre_rol = ? AND p.nombre_permiso = ?
         LIMIT 1`,
        [userRol, nombrePermiso],
        (err2, filas) => {
          if (err2) {
            console.error('Error al verificar permiso:', err2);
            return res.status(500).json({ ok: false, mensaje: 'Error al verificar permisos' });
          }

          if (filas.length === 0) {
            return res.status(403).json({
              ok: false,
              mensaje: 'Acceso denegado. Tu rol no tiene el permiso requerido.',
              permisoRequerido: nombrePermiso,
              rolActual: userRol
            });
          }

          next();
        }
      );
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
app.post("/registraradm", verificarPermiso('Usuarios'), async (req, res) => {

  const { nombres, apellidos, identidad, telefono, email, password, rol, id_cuidador, fecha_nacimiento, usa_silla_ruedas } = req.body;
  const correoNormalizado = String(email || '').trim().toLowerCase();

  // Validación básica
  if (!nombres || !apellidos || !identidad || !telefono || !email || !password || !rol) {
    return res.status(400).json({ error: "Todos los campos son obligatorios." });
  }

  if (!esCorreoDominioPermitido(correoNormalizado)) {
    return res.status(400).json({ error: "El correo no pertenece a un dominio permitido." });
  }

  // Sección 5 - Módulo de pacientes: la cuenta de un paciente (rol "usuario")
  // debe requerir la asignación de un cuidador desde su creación; ya no se
  // permite crear un paciente sin cuidador (evita medicamentos "sin dueño").
  const idCuidadorNum = parseInt(id_cuidador, 10);
  if (rol === 'usuario' && (!Number.isInteger(idCuidadorNum) || idCuidadorNum <= 0)) {
    return res.status(400).json({ error: "Debe asignar un cuidador al crear una cuenta de paciente." });
  }

  // Hashear la contraseña antes de insertar
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // SQL para insertar el usuario
  // requiere_cambio_password = 1: la contrasena fue asignada por el administrador
  // (generica/temporal), por lo que el usuario debe cambiarla obligatoriamente en su
  // primer inicio de sesion y no podra volver a usar esta misma contrasena.
  const sql = `
    INSERT INTO usuarios (nombres, apellidos, identidad, telefono, email, password, rol, requiere_cambio_password, fecha_nacimiento, usa_silla_ruedas)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `;

db.query(sql, [nombres, apellidos, identidad, telefono, correoNormalizado, hashedPassword, rol, fecha_nacimiento || null, usa_silla_ruedas ? 1 : 0], (err, result) => {


  if (err) {
    //console.error("Error SQL completo:", err); // <-- imprime todo
    return res.status(500).json({ error: "Error al registrar usuario en la base de datos.", detalle: err.message });
  }

  registrarBitacora(req, 'usuarios.crear', `Usuario "${correoNormalizado}" creado con rol "${rol}"`);

  // Si es un paciente, validar el cuidador y crear la asignación de una vez.
  if (rol === 'usuario') {
    const idPacienteNuevo = result.insertId;
    const sqlValidarCuidador = "SELECT id FROM usuarios WHERE id = ? AND rol = 'empleado' LIMIT 1";
    db.query(sqlValidarCuidador, [idCuidadorNum], (errValidar, cuidadores) => {
      if (errValidar || !cuidadores.length) {
        // El usuario ya se creó; se informa el problema con la asignación
        // para que el administrador la corrija desde "Cuidadores-Pacientes".
        return res.status(201).json({
          mensaje: "Usuario registrado con éxito, pero el cuidador indicado no es válido. Asígnelo manualmente desde Cuidadores-Pacientes.",
          id: idPacienteNuevo
        });
      }

      const sqlAsignar = 'INSERT INTO cuidador_pacientes (cuidador_id, paciente_id) VALUES (?, ?)';
      db.query(sqlAsignar, [idCuidadorNum, idPacienteNuevo], (errAsignar) => {
        if (errAsignar) {
          return res.status(201).json({
            mensaje: "Usuario registrado con éxito, pero no se pudo asignar el cuidador. Asígnelo manualmente desde Cuidadores-Pacientes.",
            id: idPacienteNuevo
          });
        }
        res.status(200).json({ mensaje: "Paciente registrado y asignado a su cuidador con éxito.", id: idPacienteNuevo });
      });
    });
    return;
  }

  res.status(200).json({ mensaje: "Usuario registrado con éxito.", id: result.insertId });
});

});


// ================================================================
// FASE A - PARAMETRIZACIÓN GENERAL
// Mantenimientos: dominios de correo permitidos, roles y parámetros
// del sistema. Todo administrable desde el sistema, nada fijo en código.
// ================================================================

// ---------- DOMINIOS DE CORREO PERMITIDOS ----------

app.get('/dominios-permitidos', verificarPermiso('Dominios de Correo'), (req, res) => {
  db.query('SELECT * FROM dominios_correo_permitidos ORDER BY id DESC', (err, rows) => {
    if (err) {
      console.error('Error al obtener dominios permitidos:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener dominios permitidos' });
    }
    res.json(rows);
  });
});

// Endpoint de solo lectura, sin requisito de rol administrador, para que
// cualquier formulario de registro (público o dentro del panel) valide el
// dominio del correo contra la lista real, sin duplicar el listado en el front.
app.get('/dominios-permitidos-publico', (req, res) => {
  db.query('SELECT dominio FROM dominios_correo_permitidos WHERE activo = 1 ORDER BY dominio ASC', (err, rows) => {
    if (err) {
      console.error('Error al obtener dominios permitidos (público):', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener dominios permitidos' });
    }
    res.json(rows.map(r => r.dominio));
  });
});

app.post('/dominios-permitidos', verificarPermiso('Dominios de Correo'), (req, res) => {
  const dominio = String(req.body.dominio || '').trim().toLowerCase();

  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(dominio)) {
    return res.status(400).json({ ok: false, mensaje: 'Ingrese un dominio válido, por ejemplo: gmail.com' });
  }

  db.query('INSERT INTO dominios_correo_permitidos (dominio) VALUES (?)', [dominio], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ ok: false, mensaje: 'Ese dominio ya está registrado.' });
      }
      console.error('Error al crear dominio permitido:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al crear el dominio' });
    }
    cargarDominiosPermitidosCache();
    registrarBitacora(req, 'dominios.crear', `Dominio "${dominio}" agregado`);
    res.json({ ok: true, mensaje: 'Dominio agregado correctamente' });
  });
});

app.put('/dominios-permitidos/:id', verificarPermiso('Dominios de Correo'), (req, res) => {
  const { id } = req.params;
  const activo = req.body.activo ? 1 : 0;
  let dominio = req.body.dominio !== undefined ? String(req.body.dominio || '').trim().toLowerCase() : null;

  if (dominio && !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(dominio)) {
    return res.status(400).json({ ok: false, mensaje: 'Ingrese un dominio válido, por ejemplo: gmail.com' });
  }

  const sql = dominio
    ? 'UPDATE dominios_correo_permitidos SET dominio = ?, activo = ? WHERE id = ?'
    : 'UPDATE dominios_correo_permitidos SET activo = ? WHERE id = ?';
  const valores = dominio ? [dominio, activo, id] : [activo, id];

  db.query(sql, valores, (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ ok: false, mensaje: 'Ese dominio ya está registrado.' });
      }
      console.error('Error al actualizar dominio permitido:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el dominio' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Dominio no encontrado' });
    }
    cargarDominiosPermitidosCache();
    registrarBitacora(req, 'dominios.editar', `Dominio id=${id} actualizado`);
    res.json({ ok: true, mensaje: 'Dominio actualizado correctamente' });
  });
});

app.delete('/dominios-permitidos/:id', verificarPermiso('Dominios de Correo'), (req, res) => {
  db.query('DELETE FROM dominios_correo_permitidos WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error al eliminar dominio permitido:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el dominio' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Dominio no encontrado' });
    }
    cargarDominiosPermitidosCache();
    registrarBitacora(req, 'dominios.eliminar', `Dominio id=${req.params.id} eliminado`);
    res.json({ ok: true, mensaje: 'Dominio eliminado correctamente' });
  });
});

// ---------- MANTENIMIENTO DE ROLES ----------

app.get('/roles', verificarPermiso('Roles'), (req, res) => {
  db.query('SELECT * FROM roles ORDER BY id DESC', (err, rows) => {
    if (err) {
      console.error('Error al obtener roles:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener roles' });
    }
    res.json(rows);
  });
});

// Lista simple de roles activos, usada por los formularios (ej. select de
// "Nuevo Usuario") para no tener nombres de rol fijos en el HTML.
app.get('/roles-activos', verificarPermiso('Usuarios'), (req, res) => {
  db.query('SELECT nombre_rol, descripcion FROM roles WHERE activo = 1 ORDER BY nombre_rol ASC', (err, rows) => {
    if (err) {
      console.error('Error al obtener roles activos:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener roles' });
    }
    res.json(rows);
  });
});

app.post('/roles', verificarPermiso('Roles'), (req, res) => {
  const nombre_rol = String(req.body.nombre_rol || '').trim().toLowerCase();
  const descripcion = req.body.descripcion ? String(req.body.descripcion).trim() : null;

  if (!/^[a-z][a-z0-9_]{2,49}$/.test(nombre_rol)) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre del rol debe tener entre 3 y 50 caracteres: solo minúsculas, números y guion bajo.' });
  }

  db.query('INSERT INTO roles (nombre_rol, descripcion) VALUES (?, ?)', [nombre_rol, descripcion], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ ok: false, mensaje: 'Ese rol ya existe.' });
      }
      console.error('Error al crear rol:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al crear el rol' });
    }
    registrarBitacora(req, 'roles.crear', `Rol "${nombre_rol}" creado`);
    registrarBitacora(req, 'roles.crear', `Rol "${nombre_rol}" creado`);
    res.json({ ok: true, mensaje: 'Rol creado correctamente' });
  });
});

app.put('/roles/:id', verificarPermiso('Roles'), (req, res) => {
  const { id } = req.params;
  const descripcion = req.body.descripcion !== undefined ? String(req.body.descripcion || '').trim() : null;
  const activo = req.body.activo ? 1 : 0;

  db.query('UPDATE roles SET descripcion = ?, activo = ? WHERE id = ?', [descripcion, activo, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar rol:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el rol' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Rol no encontrado' });
    }
    registrarBitacora(req, 'roles.editar', `Rol id=${id} actualizado`);
    registrarBitacora(req, 'roles.editar', `Rol id=${id} actualizado`);
    res.json({ ok: true, mensaje: 'Rol actualizado correctamente' });
  });
});

app.delete('/roles/:id', verificarPermiso('Roles'), (req, res) => {
  const { id } = req.params;

  db.query('SELECT nombre_rol FROM roles WHERE id = ?', [id], (err, rolRows) => {
    if (err) {
      console.error('Error al eliminar rol:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el rol' });
    }
    if (rolRows.length === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Rol no encontrado' });
    }

    // No se permite eliminar un rol que ya tiene usuarios asignados, para no
    // dejar usuarios "huérfanos" sin un rol válido.
    db.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol = ?', [rolRows[0].nombre_rol], (err2, countRows) => {
      if (err2) {
        console.error('Error al validar uso del rol:', err2);
        return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el rol' });
      }
      if (countRows[0].total > 0) {
        return res.status(400).json({ ok: false, mensaje: `No se puede eliminar: hay ${countRows[0].total} usuario(s) con este rol.` });
      }
      db.query('DELETE FROM roles WHERE id = ?', [id], (err3) => {
        if (err3) {
          console.error('Error al eliminar rol:', err3);
          return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el rol' });
        }
        registrarBitacora(req, 'roles.eliminar', `Rol "${rolRows[0].nombre_rol}" eliminado`);
        registrarBitacora(req, 'roles.eliminar', `Rol "${rolRows[0].nombre_rol}" eliminado`);
        res.json({ ok: true, mensaje: 'Rol eliminado correctamente' });
      });
    });
  });
});

// ---------- PARÁMETROS GENERALES DEL SISTEMA ----------

app.get('/parametros', verificarPermiso('Parámetros del Sistema'), (req, res) => {
  db.query('SELECT * FROM parametros_sistema ORDER BY clave ASC', (err, rows) => {
    if (err) {
      console.error('Error al obtener parámetros del sistema:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener parámetros' });
    }
    res.json(rows);
  });
});

// Endpoint de solo lectura, sin requisito de rol administrador, para que las
// pantallas de inventario (paciente/cuidador/empleado) puedan pintar los
// mismos umbrales de stock que configura el administrador, sin valores fijos.
app.get('/parametros-publicos', (req, res) => {
  db.query(
    "SELECT clave, valor FROM parametros_sistema WHERE clave IN ('stock_critico_umbral', 'stock_bajo_umbral', 'mostrar_recompensas')",
    (err, rows) => {
      if (err) {
        console.error('Error al obtener parámetros públicos:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener parámetros' });
      }
      const salida = {};
      rows.forEach(r => { salida[r.clave] = r.valor; });
      res.json(salida);
    }
  );
});

app.put('/parametros/:id', verificarPermiso('Parámetros del Sistema'), (req, res) => {
  const { id } = req.params;
  const valor = req.body.valor;

  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return res.status(400).json({ ok: false, mensaje: 'El valor es obligatorio' });
  }

  db.query('UPDATE parametros_sistema SET valor = ? WHERE id = ?', [String(valor).trim(), id], (err, result) => {
    if (err) {
      console.error('Error al actualizar parámetro:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el parámetro' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Parámetro no encontrado' });
    }
    registrarBitacora(req, 'parametros.actualizar', `Parámetro id=${id} actualizado a "${valor}"`);
    res.json({ ok: true, mensaje: 'Parámetro actualizado correctamente' });
  });
});

// ================================================================
// FASE B - MÓDULO DE SEGURIDAD: Permisos, Bitácora, Backup y Restore
// ================================================================

// ---------- MANTENIMIENTO DE PERMISOS ----------

app.get('/permisos', verificarPermiso('Permisos'), (req, res) => {
  db.query('SELECT * FROM permisos ORDER BY nombre_permiso ASC', (err, rows) => {
    if (err) {
      console.error('Error al obtener permisos:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener permisos' });
    }
    res.json(rows);
  });
});

app.post('/permisos', verificarPermiso('Permisos'), (req, res) => {
  const nombre_permiso = String(req.body.nombre_permiso || '').trim();
  const descripcion = req.body.descripcion ? String(req.body.descripcion).trim() : null;

  // El nombre del permiso debe verse igual al nombre del módulo del sistema
  // que desbloquea (ej. "Usuarios", "Citas Médicas"), por eso se permiten
  // letras (con tildes/ñ), números, espacios y guiones.
  if (!/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 _-]{2,99}$/.test(nombre_permiso)) {
    return res.status(400).json({ ok: false, mensaje: 'Nombre de permiso inválido. Use el mismo nombre del módulo del sistema, ej: Citas Médicas' });
  }

  db.query('INSERT INTO permisos (nombre_permiso, descripcion) VALUES (?, ?)', [nombre_permiso, descripcion], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ ok: false, mensaje: 'Ese permiso ya existe.' });
      }
      console.error('Error al crear permiso:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al crear el permiso' });
    }
    registrarBitacora(req, 'permisos.crear', `Permiso "${nombre_permiso}" creado`);
    res.json({ ok: true, mensaje: 'Permiso creado correctamente' });
  });
});

app.delete('/permisos/:id', verificarPermiso('Permisos'), (req, res) => {
  db.query('DELETE FROM permisos WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error al eliminar permiso:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el permiso' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Permiso no encontrado' });
    }
    registrarBitacora(req, 'permisos.eliminar', `Permiso id=${req.params.id} eliminado`);
    res.json({ ok: true, mensaje: 'Permiso eliminado correctamente' });
  });
});

// Permisos asignados a un rol específico (para pintar los checkboxes)
app.get('/roles/:nombreRol/permisos', verificarPermiso('Permisos'), (req, res) => {
  const { nombreRol } = req.params;
  db.query(
    `SELECT p.id, p.nombre_permiso, p.descripcion,
            (rp.id IS NOT NULL) AS asignado
     FROM permisos p
     LEFT JOIN roles_permisos rp ON rp.id_permiso = p.id AND rp.nombre_rol = ?
     ORDER BY p.nombre_permiso ASC`,
    [nombreRol],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener permisos del rol:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener permisos del rol' });
      }
      res.json(rows.map(r => ({ ...r, asignado: !!r.asignado })));
    }
  );
});

// Reemplaza por completo la lista de permisos de un rol (checkboxes -> guardar)
app.put('/roles/:nombreRol/permisos', verificarPermiso('Permisos'), (req, res) => {
  const { nombreRol } = req.params;
  const idsPermisos = Array.isArray(req.body.idsPermisos) ? req.body.idsPermisos.map(Number).filter(Number.isFinite) : [];

  db.query('DELETE FROM roles_permisos WHERE nombre_rol = ?', [nombreRol], (err) => {
    if (err) {
      console.error('Error al actualizar permisos del rol:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al actualizar permisos del rol' });
    }
    if (idsPermisos.length === 0) {
      registrarBitacora(req, 'permisos.asignar', `Permisos del rol "${nombreRol}" limpiados (0 permisos)`);
      return res.json({ ok: true, mensaje: 'Permisos del rol actualizados correctamente' });
    }
    const valores = idsPermisos.map(idPermiso => [nombreRol, idPermiso]);
    db.query('INSERT INTO roles_permisos (nombre_rol, id_permiso) VALUES ?', [valores], (err2) => {
      if (err2) {
        console.error('Error al asignar permisos al rol:', err2);
        return res.status(500).json({ ok: false, mensaje: 'Error al actualizar permisos del rol' });
      }
      registrarBitacora(req, 'permisos.asignar', `Rol "${nombreRol}" ahora tiene ${idsPermisos.length} permiso(s)`);
      res.json({ ok: true, mensaje: 'Permisos del rol actualizados correctamente' });
    });
  });
});

// ---------- BITÁCORA (AUDITORÍA) ----------

app.get('/bitacora', verificarPermiso('Bitácora'), (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 200, 500);
  db.query('SELECT * FROM bitacora ORDER BY id DESC LIMIT ?', [limite], (err, rows) => {
    if (err) {
      console.error('Error al obtener bitácora:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al obtener la bitácora' });
    }
    res.json(rows);
  });
});

// ---------- BACKUP Y RESTORE ----------
// Respalda/restaura únicamente las tablas de configuración del módulo de
// Seguridad (usuarios, roles, permisos, dominios permitidos y parámetros).
// No incluye datos clínicos (medicamentos, tomas, citas, etc.) para mantener
// el respaldo liviano y enfocado en lo que pide este módulo.

const TABLAS_BACKUP = ['roles', 'permisos', 'roles_permisos', 'dominios_correo_permitidos', 'parametros_sistema'];

app.get('/backup', verificarPermiso('Backup y Restore'), async (req, res) => {
  try {
    const backup = { generado_en: new Date().toISOString(), tablas: {} };

    for (const tabla of TABLAS_BACKUP) {
      // eslint-disable-next-line no-await-in-loop
      const filas = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM ${tabla}`, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
      backup.tablas[tabla] = filas;
    }

    registrarBitacora(req, 'backup.generar', `Backup generado con tablas: ${TABLAS_BACKUP.join(', ')}`);
    res.setHeader('Content-Disposition', `attachment; filename="siscom-backup-${Date.now()}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Error al generar backup:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al generar el backup' });
  }
});

// Orden de borrado: primero la tabla "hija" (roles_permisos, que tiene FK hacia
// permisos con ON DELETE CASCADE) y después las tablas "padre". Así no dependemos
// de que el CASCADE se dispare en el momento justo y el borrado es predecible.
const ORDEN_BORRADO_RESTORE = ['roles_permisos', 'roles', 'permisos', 'dominios_correo_permitidos', 'parametros_sistema'];
// Orden de inserción: al revés, primero las tablas "padre" y al final la "hija",
// para que las FK siempre encuentren la fila referenciada ya insertada.
const ORDEN_INSERCION_RESTORE = ['roles', 'permisos', 'roles_permisos', 'dominios_correo_permitidos', 'parametros_sistema'];

// Tras un ciclo JSON.stringify/JSON.parse (generar backup -> guardar archivo ->
// subir archivo -> restaurar), las columnas de tipo fecha llegan como texto en
// formato ISO ("2026-07-10T10:00:00.000Z") en lugar de objeto Date. MySQL no
// acepta ese formato tal cual para columnas DATETIME/TIMESTAMP, así que se
// normaliza antes de insertar.
function normalizarValorRestore(valor) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(valor)) {
    return valor.replace('T', ' ').replace('Z', '').replace(/\.\d+$/, '');
  }
  return valor;
}

app.post('/restore', verificarPermiso('Backup y Restore'), (req, res) => {
  const backup = req.body;
  if (!backup || typeof backup.tablas !== 'object') {
    return res.status(400).json({ ok: false, mensaje: 'Archivo de backup inválido' });
  }

  const query = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
  });

  db.beginTransaction(async (errTx) => {
    if (errTx) {
      console.error('Error al iniciar transacción de restore:', errTx);
      return res.status(500).json({ ok: false, mensaje: 'Error al restaurar el backup. Verifica que el archivo sea un backup válido de SISCOM.' });
    }

    try {
      // 1) Borrar (todo dentro de la misma transacción: si algo falla más
      // adelante, este borrado también se revierte y no se pierde nada).
      for (const tabla of ORDEN_BORRADO_RESTORE) {
        if (!Array.isArray(backup.tablas[tabla])) continue;
        // eslint-disable-next-line no-await-in-loop
        await query(`DELETE FROM ${tabla}`);
      }

      // 2) Insertar con los datos del archivo de backup.
      for (const tabla of ORDEN_INSERCION_RESTORE) {
        const filas = backup.tablas[tabla];
        if (!Array.isArray(filas) || filas.length === 0) continue;

        const columnas = Object.keys(filas[0]);
        const placeholders = columnas.map(c => `\`${c}\``).join(', ');
        const valores = filas.map(fila => columnas.map(col => normalizarValorRestore(fila[col])));

        // eslint-disable-next-line no-await-in-loop
        await query(`INSERT INTO ${tabla} (${placeholders}) VALUES ?`, [valores]);
      }

      db.commit((errCommit) => {
        if (errCommit) {
          console.error('Error al confirmar restore:', errCommit);
          return db.rollback(() => {
            res.status(500).json({ ok: false, mensaje: 'Error al restaurar el backup. Verifica que el archivo sea un backup válido de SISCOM.' });
          });
        }
        cargarDominiosPermitidosCache();
        registrarBitacora(req, 'backup.restaurar', `Backup restaurado sobre tablas: ${TABLAS_BACKUP.join(', ')}`);
        res.json({ ok: true, mensaje: 'Backup restaurado correctamente' });
      });
    } catch (error) {
      console.error('Error al restaurar backup:', error);
      db.rollback(() => {
        res.status(500).json({ ok: false, mensaje: 'Error al restaurar el backup. Verifica que el archivo sea un backup válido de SISCOM.' });
      });
    }
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
// Nota de seguridad: el filtrado por paciente asignado también se aplica en
// el frontend del cuidador, pero eso es fácilmente evitable llamando a este
// endpoint directamente. Por eso aquí, si la petición trae un token de
// sesión válido de un cuidador (rol 'empleado'), se restringe la respuesta
// a únicamente los medicamentos de sus pacientes asignados. Si no hay token,
// o el usuario tiene otro rol (p. ej. administrador), se mantiene el
// comportamiento anterior y se devuelven todos los registros, para no
// romper otras vistas que dependen de este endpoint.
app.get('/Registro_medicamentos', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const session = token ? authTokens[token] : null;

  const enviarTodos = () => {
    const sql = 'SELECT * FROM Registro_medicamentos ORDER BY id DESC';
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json({ mensaje: 'Error al cargar registro' });
      res.json(results);
    });
  };

  if (!session || Date.now() > session.expires) {
    return enviarTodos();
  }

  db.query('SELECT rol FROM usuarios WHERE id = ?', [session.userId], (err, results) => {
    if (err || results.length === 0) {
      return enviarTodos();
    }

    if (results[0].rol !== 'empleado') {
      return enviarTodos();
    }

    const sqlCuidador = `
      SELECT rm.*
      FROM Registro_medicamentos rm
      INNER JOIN cuidador_pacientes cp ON cp.paciente_id = rm.paciente_id
      WHERE cp.cuidador_id = ?
      ORDER BY rm.id DESC
    `;
    db.query(sqlCuidador, [session.userId], (errCuidador, resultsCuidador) => {
      if (errCuidador) return res.status(500).json({ mensaje: 'Error al cargar registro' });
      res.json(resultsCuidador);
    });
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
  const sql = 'SELECT * FROM inventario ORDER BY id DESC';
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
// Sección 5.1 - Citas del paciente: solo consulta (próximas + historial).
// El paciente ya NO puede agendar citas por su cuenta; esta ruta reemplaza
// el fetch roto que el frontend hacía antes contra "/citas/:id" (esa ruta
// nunca existió, por eso "Mis Citas" nunca cargaba datos reales).
app.get('/citas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const sql = 'SELECT * FROM citas WHERE id_paciente = ? ORDER BY fecha_hora ASC';

  db.query(sql, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener citas del paciente:', err);
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
  const { id_usuario, nombre_medicamento, dosis, frecuencia, fecha_inicio, fecha_fin } = req.body;

  if (!id_usuario || !nombre_medicamento || !dosis || !frecuencia) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = 'INSERT INTO recetas_medicas (id_usuario, nombre_medicamento, dosis, frecuencia, fecha_inicio, fecha_fin, fecha_subida) VALUES (?, ?, ?, ?, ?, ?, NOW())';
  db.query(sql, [id_usuario, nombre_medicamento, dosis, frecuencia, fecha_inicio || null, fecha_fin || null], (err, result) => {
    if (err) {
      console.error('Error al guardar receta:', err);
      return res.status(500).json({ mensaje: 'Error al guardar la receta' });
    }
    res.json({ mensaje: 'Receta guardada correctamente', id: result.insertId });
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
// Sección 5.2 - Corrige el flujo de edición: antes no existía una ruta para
// actualizar una receta, así que "editar" en la práctica implicaba borrar y
// crear una receta nueva (perdiendo el historial y duplicando registros).
app.put('/recetas/:id', (req, res) => {
  const { id } = req.params;
  const { nombre_medicamento, dosis, frecuencia, fecha_inicio, fecha_fin } = req.body;

  if (!nombre_medicamento || !dosis || !frecuencia) {
    return res.status(400).json({ mensaje: 'Campos incompletos' });
  }

  const sql = `
    UPDATE recetas_medicas
    SET nombre_medicamento = ?, dosis = ?, frecuencia = ?, fecha_inicio = ?, fecha_fin = ?
    WHERE id = ?
  `;

  db.query(sql, [nombre_medicamento, dosis, frecuencia, fecha_inicio || null, fecha_fin || null, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar receta:', err);
      return res.status(500).json({ mensaje: 'Error al actualizar la receta' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }
    res.json({ mensaje: 'Receta actualizada correctamente' });
  });
});



// ============================================
// RUTAS DE USUARIOS (PROTEGIDAS - SOLO ADMINISTRADOR)
// ============================================

// Obtener todos los usuarios - Solo administrador
app.get('/usuarios', verificarPermiso('Usuarios'), (req, res) => {
  const sql = 'SELECT * FROM usuarios ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cargar usuarios' });
    res.json(results);
  });
});


// Actualizar usuario - Solo administrador
app.put('/usuarios/:id', verificarPermiso('Usuarios'), async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, identidad, telefono, email, password, rol, fecha_nacimiento, usa_silla_ruedas } = req.body;
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

    if (fecha_nacimiento !== undefined) {
      campos.push('fecha_nacimiento = ?');
      valores.push(fecha_nacimiento || null);
    }

    if (usa_silla_ruedas !== undefined) {
      campos.push('usa_silla_ruedas = ?');
      valores.push(usa_silla_ruedas ? 1 : 0);
    }

    if (passwordTexto.length > 0) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(passwordTexto, saltRounds);
      campos.push('password = ?');
      valores.push(hashedPassword);
      // La nueva contrasena la asigno el administrador: forzar cambio obligatorio
      // en el proximo inicio de sesion del usuario.
      campos.push('requiere_cambio_password = ?');
      valores.push(1);
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

      registrarBitacora(req, 'usuarios.editar', `Usuario id=${id} (${correoNormalizado}) actualizado`);
      res.json({ mensaje: 'Usuario actualizado correctamente' });
    });
  });
});

// Obtener perfil del paciente autenticado
app.get('/mi-perfil', verificarRol(['usuario']), (req, res) => {
  const sql = 'SELECT id, nombres, apellidos, identidad, telefono, tipo_sangre, operaciones_realizadas, alergias, enfermedades_cronicas, tatuajes, otras_enfermedades, fecha_nacimiento, usa_silla_ruedas, email, rol FROM usuarios WHERE id = ? LIMIT 1';
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
// Soporta actualizaciones parciales: si solo se envian los campos de la Ficha Medica
// (operaciones_realizadas, alergias, enfermedades_cronicas, tatuajes, otras_enfermedades)
// se conservan los datos personales actuales sin exigirlos de nuevo.
app.put('/mi-perfil', verificarRol(['usuario']), (req, res) => {
  const body = req.body || {};
  const TIPOS_SANGRE_VALIDOS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const sqlActual = 'SELECT id, nombres, apellidos, identidad, telefono, tipo_sangre, operaciones_realizadas, alergias, enfermedades_cronicas, tatuajes, otras_enfermedades, email, rol FROM usuarios WHERE id = ? LIMIT 1';
  db.query(sqlActual, [req.user.id], (errActual, actuales) => {
    if (errActual) {
      return res.status(500).json({ mensaje: 'Error al cargar tu perfil actual' });
    }
    if (!actuales.length) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const actual = actuales[0];

    const nombresTxt = body.nombres !== undefined ? String(body.nombres || '').trim() : String(actual.nombres || '');
    const apellidosTxt = body.apellidos !== undefined ? String(body.apellidos || '').trim() : String(actual.apellidos || '');
    const identidadTxt = body.identidad !== undefined ? String(body.identidad || '').replace(/\D/g, '') : String(actual.identidad || '');
    const telefonoTxt = body.telefono !== undefined ? String(body.telefono || '').replace(/\D/g, '') : String(actual.telefono || '');
    const tipoSangreTxt = body.tipo_sangre !== undefined ? String(body.tipo_sangre || '').trim().toUpperCase() : String(actual.tipo_sangre || '');
    const correoNormalizado = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : String(actual.email || '').toLowerCase();

    // Campos de Ficha Medica: opcionales, sin formato obligatorio
    const operacionesTxt = body.operaciones_realizadas !== undefined ? String(body.operaciones_realizadas || '').trim() : (actual.operaciones_realizadas || '');
    const alergiasTxt = body.alergias !== undefined ? String(body.alergias || '').trim() : (actual.alergias || '');
    const enfermedadesCronicasTxt = body.enfermedades_cronicas !== undefined ? String(body.enfermedades_cronicas || '').trim() : (actual.enfermedades_cronicas || '');
    const tatuajesTxt = body.tatuajes !== undefined ? String(body.tatuajes || '').trim() : (actual.tatuajes || '');
    const otrasEnfermedadesTxt = body.otras_enfermedades !== undefined ? String(body.otras_enfermedades || '').trim() : (actual.otras_enfermedades || '');

    if (!nombresTxt || !apellidosTxt || !identidadTxt || !telefonoTxt || !correoNormalizado || !tipoSangreTxt) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios, incluyendo el tipo de sangre.' });
    }

    if (!TIPOS_SANGRE_VALIDOS.includes(tipoSangreTxt)) {
      return res.status(400).json({ mensaje: 'El tipo de sangre no es valido.' });
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

      const sqlUpdate = `UPDATE usuarios SET nombres = ?, apellidos = ?, identidad = ?, telefono = ?, tipo_sangre = ?,
        operaciones_realizadas = ?, alergias = ?, enfermedades_cronicas = ?, tatuajes = ?, otras_enfermedades = ?,
        email = ? WHERE id = ?`;
      const params = [
        nombresTxt, apellidosTxt, identidadTxt, telefonoTxt, tipoSangreTxt,
        operacionesTxt, alergiasTxt, enfermedadesCronicasTxt, tatuajesTxt, otrasEnfermedadesTxt,
        correoNormalizado, req.user.id
      ];

      db.query(sqlUpdate, params, (errUpd) => {
        if (errUpd) {
          return res.status(500).json({ mensaje: 'Error al actualizar tu perfil' });
        }

        const sqlUsuario = 'SELECT id, nombres, apellidos, identidad, telefono, tipo_sangre, operaciones_realizadas, alergias, enfermedades_cronicas, tatuajes, otras_enfermedades, email, rol FROM usuarios WHERE id = ? LIMIT 1';
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
              tipo_sangre: tipoSangreTxt,
              operaciones_realizadas: operacionesTxt,
              alergias: alergiasTxt,
              enfermedades_cronicas: enfermedadesCronicasTxt,
              tatuajes: tatuajesTxt,
              otras_enfermedades: otrasEnfermedadesTxt,
              email: correoNormalizado,
              rol: 'usuario'
            }
          });
        });
      });
    });
  });
});

// Eliminar usuario - Solo administrador
app.delete('/usuarios/:id', verificarPermiso('Usuarios'), (req, res) => {
  const { id } = req.params;
  
  // Evitar que un administrador se elimine a sí mismo
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario' });
  }
  
  const sql = 'DELETE FROM usuarios WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ mensaje: 'Error al eliminar usuario' });
    registrarBitacora(req, 'usuarios.eliminar', `Usuario id=${id} eliminado`);
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

// Limpiar (eliminar) todo el historial de medicacion de un paciente
app.delete('/historialMedicacionEventos/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = 'DELETE FROM tomas_medicas WHERE id_usuario = ?';
  db.query(sql, [id_usuario], (err, result) => {
    if (err) {
      console.error('Error al limpiar historial de medicacion:', err);
      return res.status(500).json({ mensaje: 'Error al limpiar el historial de medicacion' });
    }

    res.json({ mensaje: 'Historial de medicación eliminado correctamente', eliminados: result.affectedRows || 0 });
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

// HU-21: Agregar contacto de emergencia (desde el Perfil del paciente)
app.post('/contactosEmergencia', verificarRol(['usuario']), (req, res) => {
  const { nombre_contacto, relacion, telefono, prioridad } = req.body || {};

  const nombreTxt = String(nombre_contacto || '').trim();
  const relacionTxt = String(relacion || '').trim();
  const telefonoTxt = String(telefono || '').trim();
  const prioridadNum = parseInt(prioridad, 10);

  if (!nombreTxt || !telefonoTxt) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre y el telefono son obligatorios.' });
  }

  const sql = 'INSERT INTO contactos_emergencia (id_usuario, nombre_contacto, relacion, telefono, prioridad) VALUES (?, ?, ?, ?, ?)';
  const valores = [req.user.id, nombreTxt, relacionTxt || null, telefonoTxt, Number.isFinite(prioridadNum) ? prioridadNum : 1];

  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Error al crear contacto de emergencia:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al guardar el contacto de emergencia' });
    }

    return res.json({
      ok: true,
      mensaje: 'Contacto de emergencia agregado correctamente.',
      contacto: {
        id: result.insertId,
        id_usuario: req.user.id,
        nombre_contacto: nombreTxt,
        relacion: relacionTxt || null,
        telefono: telefonoTxt,
        prioridad: Number.isFinite(prioridadNum) ? prioridadNum : 1
      }
    });
  });
});

// HU-21: Actualizar contacto de emergencia propio
app.put('/contactosEmergencia/:id', verificarRol(['usuario']), (req, res) => {
  const { id } = req.params;
  const { nombre_contacto, relacion, telefono, prioridad } = req.body || {};

  const nombreTxt = String(nombre_contacto || '').trim();
  const relacionTxt = String(relacion || '').trim();
  const telefonoTxt = String(telefono || '').trim();
  const prioridadNum = parseInt(prioridad, 10);

  if (!nombreTxt || !telefonoTxt) {
    return res.status(400).json({ ok: false, mensaje: 'El nombre y el telefono son obligatorios.' });
  }

  const sql = `
    UPDATE contactos_emergencia
    SET nombre_contacto = ?, relacion = ?, telefono = ?, prioridad = ?
    WHERE id = ? AND id_usuario = ?
  `;
  const valores = [nombreTxt, relacionTxt || null, telefonoTxt, Number.isFinite(prioridadNum) ? prioridadNum : 1, id, req.user.id];

  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Error al actualizar contacto de emergencia:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el contacto de emergencia' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, mensaje: 'Contacto no encontrado' });
    }
    return res.json({ ok: true, mensaje: 'Contacto de emergencia actualizado correctamente.' });
  });
});

// HU-21: Eliminar contacto de emergencia propio
app.delete('/contactosEmergencia/:id', verificarRol(['usuario']), (req, res) => {
  const { id } = req.params;

  db.query(
    'DELETE FROM contactos_emergencia WHERE id = ? AND id_usuario = ?',
    [id, req.user.id],
    (err, result) => {
      if (err) {
        console.error('Error al eliminar contacto de emergencia:', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el contacto de emergencia' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, mensaje: 'Contacto no encontrado' });
      }
      return res.json({ ok: true, mensaje: 'Contacto de emergencia eliminado correctamente.' });
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
// INICIAR SERVIDOR ghh
// ============================================

app.listen(3000, () => {

  console.log('Servidor corriendo en http://localhost:3000');
  console.log('CORS habilitado para todas las solicitudes');
});