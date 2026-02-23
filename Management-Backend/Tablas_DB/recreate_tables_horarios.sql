-- ============================================
-- RECREAR TABLAS DE HORARIOS CON ESTRUCTURA CORRECTA
-- ============================================

-- 1. Eliminar tablas existentes (si tienen estructura incorrecta)
DROP TABLE IF EXISTS conflictos_horarios;
DROP TABLE IF EXISTS configuracion_horarios;
DROP TABLE IF EXISTS horarios_medicamentos;

-- 2. Crear tabla horarios_medicamentos con TODAS las columnas necesarias
CREATE TABLE horarios_medicamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_receta INT NOT NULL,
  id_usuario INT NOT NULL,
  hora TIME NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para búsquedas eficientes
  INDEX idx_horarios_receta (id_receta),
  INDEX idx_horarios_usuario (id_usuario),
  INDEX idx_horarios_hora (hora),
  INDEX idx_horarios_activo (activo)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Crear tabla configuracion_horarios con TODAS las columnas necesarias
CREATE TABLE configuracion_horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_receta INT NOT NULL,
  notificaciones_activas BOOLEAN DEFAULT TRUE,
  minutos_anticipacion INT DEFAULT 15,
  dias_semana JSON DEFAULT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin DATE DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_config_usuario (id_usuario),
  INDEX idx_config_receta (id_receta),
  
  -- Un usuario solo puede tener una configuración por receta
  UNIQUE KEY unique_config_usuario_receta (id_usuario, id_receta)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Crear tabla conflictos_horarios
CREATE TABLE conflictos_horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_receta_1 INT NOT NULL,
  id_receta_2 INT NOT NULL,
  hora_conflictiva TIME NOT NULL,
  diferencia_minutos INT NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  fecha_detectado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_resuelto TIMESTAMP NULL,
  
  INDEX idx_conflictos_usuario (id_usuario),
  INDEX idx_conflictos_estado (estado)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICACIÓN: Mostrar estructura de las tablas creadas
-- ============================================

DESCRIBE horarios_medicamentos;
DESCRIBE configuracion_horarios;
DESCRIBE conflictos_horarios;

-- ============================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================
SELECT 'Tablas recreadas exitosamente con todas las columnas necesarias' AS mensaje;
