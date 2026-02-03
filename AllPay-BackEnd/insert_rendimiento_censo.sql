-- Inserta/actualiza rendimientos por departamento (decimales, 2 cifras)
-- Valida FK contra DepartamentosPais (códigos de 2 dígitos como texto)

BEGIN;

WITH data(cod_departamento, rcenso) AS (
  VALUES
    ('91', 448.17),
    ('05', 434.52),
    ('81', 418.45),
    ('08', 448.17),
    ('13', 448.17),
    ('15', 448.17),
    ('17', 417.53),
    ('18', 448.17),
    ('85', 448.17),
    ('19', 448.17),
    ('20', 392.00),
    ('27', 448.17),
    ('23', 448.17),
    ('25', 324.00),
    ('94', 448.17),
    ('95', 471.00),
    ('41', 414.28),
    ('44', 448.17),
    ('47', 448.17),
    ('50', 406.00),
    ('52', 439.00),
    ('54', 460.00),
    ('86', 413.00),
    ('63', 448.17),
    ('66', 448.17),
    ('68', 471.80),
    ('70', 448.17),
    ('73', 410.22),
    ('76', 448.17),
    ('97', 448.17),
    ('99', 448.17)
)
INSERT INTO "RendimientoCensoDepartamento" (
  "CodDepartamento",
  "rendimiento_censo",
  "fecha_actualizacion",
  "usuario_actualizacion_id"
)
SELECT d.cod_departamento, d.rcenso, CURRENT_TIMESTAMP, NULL
FROM data d
JOIN "DepartamentosPais" dep
  ON dep."CodDepartamento" = d.cod_departamento
ON CONFLICT ("CodDepartamento") DO UPDATE
SET 
  "rendimiento_censo" = EXCLUDED."rendimiento_censo",
  "fecha_actualizacion" = EXCLUDED."fecha_actualizacion",
  "usuario_actualizacion_id" = NULL;

COMMIT;
