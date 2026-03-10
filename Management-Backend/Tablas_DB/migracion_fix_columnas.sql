-- ============================================
-- MIGRACIÓN: Agregar columnas faltantes a las tablas de horarios
-- ============================================

-- Verificar y agregar columnas faltantes en horarios_medicamentos
ALTER TABLE horarios_medicamentos 
ADD COLUMN IF NOT EXISTS id_receta INT NOT NULL AFTER id,
ADD COLUMN IF NOT EXISTS id_usuario INT NOT NULL AFTER id_receta,
ADD COLUMN IF NOT EXISTS hora TIME NOT NULL AFTER id_usuario,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE AFTER hora,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER activo,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_horarios_receta ON horarios_medicamentos(id_receta);
CREATE INDEX IF NOT EXISTS idx_horarios_usuario ON horarios_medicamentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_horarios_hora ON horarios_medicamentos(hora);

-- Verificar y agregar columnas faltantes en configuracion_horarios
ALTER TABLE configuracion_horarios 
ADD COLUMN IF NOT EXISTS id_receta INT NOT NULL AFTER id,
ADD COLUMN IF NOT EXISTS id_usuario INT NOT NULL AFTER id_receta,
ADD COLUMN IF NOT EXISTS notificaciones_activas BOOLEAN DEFAULT TRUE AFTER id_usuario,
ADD COLUMN IF NOT EXISTS minutos_anticipacion INT DEFAULT 15 AFTER notificaciones_activas,
ADD COLUMN IF NOT EXISTS dias_semana JSON DEFAULT NULL AFTER minutos_anticipacion,
ADD COLUMN IF NOT EXISTS fecha_inicio DATE DEFAULT NULL AFTER dias_semana,
ADD COLUMN IF NOT EXISTS fecha_fin DATE DEFAULT NULL AFTER fecha_inicio,
ADD COLUMN IF NOT EXISTS notas TEXT DEFAULT NULL AFTER fecha_fin,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER notas,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Crear índices y restricciones únicas
CREATE INDEX IF NOT EXISTS idx_config_usuario ON configuracion_horarios(id_usuario);
CREATE INDEX IF NOT EXISTS idx_config_receta ON configuracion_horarios(id_receta);
ALTER TABLE configuracion_horarios 
ADD CONSTRAINT IF NOT EXISTS unique_config_usuario_receta UNIQUE (id_usuario, id_receta);

-- Verificar y agregar columnas faltantes en conflictos_horarios
ALTER TABLE conflictos_horarios 
ADD COLUMN IF NOT EXISTS id_receta_1 INT NOT NULL AFTER id,
ADD COLUMN IF NOT EXISTS id_receta_2 INT NOT NULL AFTER id_receta_1,
ADD COLUMN IF NOT EXISTS id_usuario INT NOT NULL AFTER id_receta_2,
ADD COLUMN IF NOT EXISTS hora_conflictiva TIME NOT NULL AFTER id_usuario,
ADD COLUMN IF NOT EXISTS diferencia_minutos INT NOT NULL AFTER hora_conflictiva,
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente' AFTER diferencia_minutos,
ADD COLUMN IF NOT EXISTS fecha_detectado TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER estado,
ADD COLUMN IF NOT EXISTS fecha_resuelto TIMESTAMP NULL AFTER fecha_detectado;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_conflictos_usuario ON conflictos_horarios(id_usuario);
CREATE INDEX IF NOT EXISTS idx_conflictos_estado ON conflictos_horarios(estado);

-- ============================================
-- VERIFICACIÓN: Mostrar estructura de las tablas
-- ============================================

DESCRIBE horarios_medicamentos;
DESCRIBE configuracion_horarios;
DESCRIBE conflictos_horarios;
