-- Script para eliminar la restricción de clave foránea en la tabla citas
-- Esto permite guardar citas sin necesidad de que el paciente exista previamente

-- Ver la estructura actual de la tabla
SHOW CREATE TABLE citas;

-- Eliminar la foreign key constraint (ajusta el nombre si es diferente)
ALTER TABLE citas DROP FOREIGN KEY fk_citas_paciente;

-- Verificar que se eliminó
SHOW CREATE TABLE citas;
