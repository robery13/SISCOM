-- ============================================
-- ACTUALIZACIÓN DE TABLA Registro_medicamentos
-- Versión compatible con MySQL 5.7+
-- ============================================

-- Agregar columnas nuevas (una por una para mayor compatibilidad)
ALTER TABLE Registro_medicamentos 
ADD COLUMN paciente_id INT NULL AFTER hora;

ALTER TABLE Registro_medicamentos 
ADD COLUMN estado VARCHAR(20) DEFAULT 'activo' AFTER paciente_id;

ALTER TABLE Registro_medicamentos 
ADD COLUMN fecha_inicio DATE NULL AFTER estado;

ALTER TABLE Registro_medicamentos 
ADD COLUMN fecha_fin DATE NULL AFTER fecha_inicio;

ALTER TABLE Registro_medicamentos 
ADD COLUMN notas TEXT NULL AFTER fecha_fin;

-- Verificar la estructura actual
DESCRIBE Registro_medicamentos;
