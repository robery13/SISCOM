-- ============================================
-- TABLA: horarios_medicamentos
-- Almacena los horarios específicos para cada medicamento
-- ============================================

CREATE TABLE IF NOT EXISTS horarios_medicamentos (
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
  
  -- Clave foránea
  FOREIGN KEY (id_receta) REFERENCES recetas_medicas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: configuracion_horarios
-- Almacena configuraciones personalizadas del paciente
-- ============================================

CREATE TABLE IF NOT EXISTS configuracion_horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_receta INT NOT NULL,
  notificaciones_activas BOOLEAN DEFAULT TRUE,
  minutos_anticipacion INT DEFAULT 15,
  dias_semana JSON DEFAULT NULL, -- ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
  fecha_inicio DATE DEFAULT NULL,
  fecha_fin DATE DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_config_usuario (id_usuario),
  INDEX idx_config_receta (id_receta),
  
  -- Clave foránea
  FOREIGN KEY (id_receta) REFERENCES recetas_medicas(id) ON DELETE CASCADE,
  
  -- Un usuario solo puede tener una configuración por receta
  UNIQUE KEY unique_config_usuario_receta (id_usuario, id_receta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLA: conflictos_horarios (opcional - para historial)
-- Registra conflictos detectados entre medicamentos
-- ============================================

CREATE TABLE IF NOT EXISTS conflictos_horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_receta_1 INT NOT NULL,
  id_receta_2 INT NOT NULL,
  hora_conflictiva TIME NOT NULL,
  diferencia_minutos INT NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, resuelto, ignorado
  fecha_detectado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_resuelto TIMESTAMP NULL,
  
  INDEX idx_conflictos_usuario (id_usuario),
  INDEX idx_conflictos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DATOS DE EJEMPLO (opcional)
-- ============================================

-- Insertar algunos horarios de ejemplo para pruebas
-- Nota: Descomentar solo si se tienen recetas existentes con IDs conocidos

/*
INSERT INTO horarios_medicamentos (id_receta, id_usuario, hora) VALUES
(1, 1, '08:00:00'),
(1, 1, '14:00:00'),
(1, 1, '20:00:00'),
(2, 1, '08:00:00'),
(2, 1, '20:00:00');

INSERT INTO configuracion_horarios (id_usuario, id_receta, notificaciones_activas, minutos_anticipacion, dias_semana) VALUES
(1, 1, TRUE, 15, '["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]'),
(1, 2, TRUE, 10, '["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]');
*/
