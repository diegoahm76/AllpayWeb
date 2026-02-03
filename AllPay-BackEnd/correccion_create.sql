-- Por si vienes de una transacción fallida
ROLLBACK;

-- 1) Normaliza nombre de columna con espacio (solo si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'ConfiguracionClasesAlerta'
      AND column_name = ' nivelPrioridad'  -- con espacio inicial
  ) THEN
    EXECUTE 'ALTER TABLE public."ConfiguracionClasesAlerta"
             RENAME COLUMN " nivelPrioridad" TO "nivelPrioridad"';
  END IF;
END$$;

-- 2) Lleva a NULL cualquier 0 en las columnas FK (evita referencias inválidas)
UPDATE public."ConfiguracionClasesAlerta"
SET "Id_ModuloDestino" = NULL
WHERE "Id_ModuloDestino" = 0;

UPDATE public."ConfiguracionClasesAlerta"
SET "Id_ModuloGenerador" = NULL
WHERE "Id_ModuloGenerador" = 0;

-- 3) MIGRA IDs de módulos de la BD antigua → a los IDs nuevos, según los nombres que compartiste
--    Viejo → Nuevo:
--      13 "Generar Paz y Salvo"           → 14
--      17 "Identificación de Recaudadores"→ 22
--      20 "Consultar Compras de Cacao"    → 24 (GERE)
--      6  "Administración de Usuarios"    → 4  (para Com_RegRec como Generador)

-- 3a) Destino: 13→14, 17→22, 20→24
UPDATE public."ConfiguracionClasesAlerta" c
SET "Id_ModuloDestino" = CASE
  WHEN c."Id_ModuloDestino" = 13 THEN 14
  WHEN c."Id_ModuloDestino" = 17 THEN 22
  WHEN c."Id_ModuloDestino" = 20 THEN 24
  ELSE c."Id_ModuloDestino"
END
WHERE c."Id_ModuloDestino" IN (13,17,20);

-- 3b) Generador específico (según dump viejo): Com_RegRec usaba 6 → ahora 4
UPDATE public."ConfiguracionClasesAlerta" c
SET "Id_ModuloGenerador" = 4
WHERE c."CodClaseAlerta" = 'Com_RegRec' AND c."Id_ModuloGenerador" = 6;

-- 4) Asegura clave primaria (o unique) en Modulos("IdModulo") para poder referenciar con FK

-- 4a) Chequea que no existan duplicados en IdModulo (no debería devolver filas)
-- (Consulta de verificación opcional)
-- SELECT "IdModulo", COUNT(*) AS n
-- FROM public."Modulos"
-- GROUP BY "IdModulo"
-- HAVING COUNT(*) > 1;

-- 4b) Crea PRIMARY KEY si no existe (si prefieres UNIQUE, cambia el bloque)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='Modulos'
      AND constraint_type='PRIMARY KEY'
  )
  THEN
    ALTER TABLE public."Modulos"
      ADD CONSTRAINT modulos_pkey PRIMARY KEY ("IdModulo");
  END IF;
END$$;

-- 5) Crea las FKs desde ConfiguracionClasesAlerta hacia Modulos (NOT VALID + VALIDATE)

-- 5a) Borra FKs antiguas si existieran (no debería, pero por si acaso)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='ConfiguracionClasesAlerta'
      AND constraint_type='FOREIGN KEY' AND constraint_name='fk_conf_alerta_mod_destino'
  ) THEN
    EXECUTE 'ALTER TABLE public."ConfiguracionClasesAlerta" DROP CONSTRAINT "fk_conf_alerta_mod_destino"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='ConfiguracionClasesAlerta'
      AND constraint_type='FOREIGN KEY' AND constraint_name='fk_conf_alerta_mod_generador'
  ) THEN
    EXECUTE 'ALTER TABLE public."ConfiguracionClasesAlerta" DROP CONSTRAINT "fk_conf_alerta_mod_generador"';
  END IF;
END$$;

-- 5b) Índices útiles (si no existen)
CREATE INDEX IF NOT EXISTS idx_conf_alerta_mod_destino
  ON public."ConfiguracionClasesAlerta" ("Id_ModuloDestino");
CREATE INDEX IF NOT EXISTS idx_conf_alerta_mod_generador
  ON public."ConfiguracionClasesAlerta" ("Id_ModuloGenerador");

-- 5c) Crea FKs como NOT VALID (evita bloqueo fuerte) y luego valida
ALTER TABLE public."ConfiguracionClasesAlerta"
  ADD CONSTRAINT "fk_conf_alerta_mod_destino"
  FOREIGN KEY ("Id_ModuloDestino")
  REFERENCES public."Modulos" ("IdModulo")
  ON UPDATE CASCADE
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public."ConfiguracionClasesAlerta"
  ADD CONSTRAINT "fk_conf_alerta_mod_generador"
  FOREIGN KEY ("Id_ModuloGenerador")
  REFERENCES public."Modulos" ("IdModulo")
  ON UPDATE CASCADE
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public."ConfiguracionClasesAlerta" VALIDATE CONSTRAINT "fk_conf_alerta_mod_destino";
ALTER TABLE public."ConfiguracionClasesAlerta" VALIDATE CONSTRAINT "fk_conf_alerta_mod_generador";

-- 6) Verificaciones finales (opcionales)
-- 6a) Que no queden referencias rotas:
-- SELECT c."CodClaseAlerta", c."Id_ModuloDestino", c."Id_ModuloGenerador"
-- FROM public."ConfiguracionClasesAlerta" c
-- LEFT JOIN public."Modulos" md ON md."IdModulo" = c."Id_ModuloDestino"
-- LEFT JOIN public."Modulos" mg ON mg."IdModulo" = c."Id_ModuloGenerador"
-- WHERE (c."Id_ModuloDestino"   IS NOT NULL AND md."IdModulo" IS NULL)
--    OR (c."Id_ModuloGenerador" IS NOT NULL AND mg."IdModulo" IS NULL);

-- 6b) Vista rápida de las alertas clave
-- SELECT "CodClaseAlerta","Id_ModuloDestino","Id_ModuloGenerador"
-- FROM public."ConfiguracionClasesAlerta"
-- WHERE "CodClaseAlerta" IN ('Com_ActPS','Com_GenPS','Com_IdeRec','Com_RegCom','Com_ValCom','Com_CarMas','Com_RegRec')
-- ORDER BY "CodClaseAlerta";
