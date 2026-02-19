-- Crear tabla tomas_medicas si no existe
CREATE TABLE IF NOT EXISTS tomas_medicas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_receta INT NOT NULL,
  nombre_medicamento VARCHAR(255) NOT NULL,
  hora_toma TIME NOT NULL,
  fecha_toma DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_tomas_usuario ON tomas_medicas(id_usuario);
CREATE INDEX idx_tomas_fecha ON tomas_medicas(fecha_toma);
CREATE INDEX idx_tomas_receta ON tomas_medicas(id_receta);
