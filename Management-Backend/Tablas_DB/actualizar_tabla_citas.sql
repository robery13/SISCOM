-- Script para agregar columnas faltantes a la tabla citas
-- Ejecutar este script en MySQL para actualizar la estructura de la tabla
-- Compatible con MySQL 5.7+

-- Verificar y agregar columna doctor
SET @existDoctor := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'doctor');
SET @sqlDoctor := IF(@existDoctor = 0, 
    'ALTER TABLE citas ADD COLUMN doctor VARCHAR(255) NULL AFTER anticipacion_min', 
    'SELECT "Columna doctor ya existe"');
PREPARE stmt1 FROM @sqlDoctor;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Verificar y agregar columna especialidad
SET @existEspecialidad := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'especialidad');
SET @sqlEspecialidad := IF(@existEspecialidad = 0, 
    'ALTER TABLE citas ADD COLUMN especialidad VARCHAR(255) NULL AFTER doctor', 
    'SELECT "Columna especialidad ya existe"');
PREPARE stmt2 FROM @sqlEspecialidad;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Verificar y agregar columna ubicacion
SET @existUbicacion := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'ubicacion');
SET @sqlUbicacion := IF(@existUbicacion = 0, 
    'ALTER TABLE citas ADD COLUMN ubicacion VARCHAR(255) NULL AFTER especialidad', 
    'SELECT "Columna ubicacion ya existe"');
PREPARE stmt3 FROM @sqlUbicacion;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Verificar y agregar columna estado
SET @existEstado := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'estado');
SET @sqlEstado := IF(@existEstado = 0, 
    'ALTER TABLE citas ADD COLUMN estado VARCHAR(50) NULL DEFAULT "programada" AFTER ubicacion', 
    'SELECT "Columna estado ya existe"');
PREPARE stmt4 FROM @sqlEstado;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- Verificar y agregar columna notas
SET @existNotas := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'notas');
SET @sqlNotas := IF(@existNotas = 0, 
    'ALTER TABLE citas ADD COLUMN notas TEXT NULL AFTER estado', 
    'SELECT "Columna notas ya existe"');
PREPARE stmt5 FROM @sqlNotas;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- Verificar la estructura actualizada
DESCRIBE citas;
