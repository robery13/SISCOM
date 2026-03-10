-- ============================================
-- ACTUALIZACIÓN DE TABLA Registro_medicamentos
-- Para soportar las nuevas funcionalidades
-- ============================================

-- Agregar columnas nuevas si no existen
ALTER TABLE Registro_medicamentos 
ADD COLUMN IF NOT EXISTS paciente_id INT NULL,
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo',
ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL,
ADD COLUMN IF NOT EXISTS notas TEXT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Crear índice para búsquedas por paciente
CREATE INDEX IF NOT EXISTS idx_paciente_id ON Registro_medicamentos(paciente_id);

-- Crear índice para filtrado por estado
CREATE INDEX IF NOT EXISTS idx_estado ON Registro_medicamentos(estado);

-- Verificar la estructura actual
DESCRIBE Registro_medicamentos;
