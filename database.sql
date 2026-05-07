CREATE DATABASE IF NOT EXISTS sistema_ventas;
USE sistema_ventas;

-- Tabla vendedores
CREATE TABLE IF NOT EXISTS vendedores (
  id_vendedor INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  foto_vendedor VARCHAR(255)
);

-- Tabla fotoVentas (según las especificaciones, es la tabla de ventas)
CREATE TABLE IF NOT EXISTS fotoVentas (
  id_venta INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATE NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  id_vendedor INT NOT NULL,
  FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor) ON DELETE CASCADE
);

-- Insertar datos de prueba opcionales
INSERT INTO vendedores (nombre, foto_vendedor) VALUES 
('Juan Pérez', 'default.jpg'),
('María García', 'default.jpg');

INSERT INTO fotoVentas (fecha, total, id_vendedor) VALUES 
('2023-10-01', 150.50, 1),
('2023-10-02', 200.00, 2);
