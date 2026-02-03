-- Script SQL para insertar datos iniciales en la tabla siesa
-- Ejecutar después de crear la tabla con las migraciones

INSERT INTO siesa (id, descripcion, auxiliar, compania, centro, unidad, sucursal) VALUES
(1, 'CUOTA DE FOMENTO', '41150301', '02', '025', '25', '010'),
(2, 'INTERES CUOTA DE FOMENTO', '41159001', '02', '025', '25', '011'),
(3, 'CUOTA DE FOMENTO AP', '13130101', '02', '025', NULL, '010'),
(4, 'INTERES AP', '13139001', '02', '025', '25', '011');
