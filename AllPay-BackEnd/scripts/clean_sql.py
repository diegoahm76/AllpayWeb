from pathlib import Path
import re

SRC = Path(r"c:/BACK FEDE/FedecacaoBack/inicialBd.sql")
BAK = Path(r"c:/BACK FEDE/FedecacaoBack/inicialBd.sql.bak")
DST = Path(r"c:/BACK FEDE/FedecacaoBack/inicialBd.sql.cleaned")

DDL_PREFIXES = (
    'CREATE TABLE', 'ALTER TABLE', 'COMMENT ON', 'SET ',
    'SELECT PG_CATALOG.SET_CONFIG', 'CREATE INDEX', 'DROP TABLE',
    'CREATE SCHEMA', 'ALTER SCHEMA', 'CREATE TYPE', 'ALTER TYPE',
    'ALTER SEQUENCE', 'CREATE SEQUENCE', 'ALTER EXTENSION', 'CREATE EXTENSION',
    'GRANT ', 'REVOKE ', 'ALTER DATABASE', 'ALTER FUNCTION', 'ALTER VIEW',
)

KEEP_PREFIXES = (
    'INSERT ', 'UPDATE ', 'COPY ', 'DELETE ',  # si hay DELETEs de datos específicos
)


def should_skip_line(line: str) -> bool:
    s = line.strip()
    if not s or s.startswith('--'):
        return False  # conservar comentarios y líneas en blanco
    up = s.upper()
    if ' OWNER TO ' in up:
        return True
    return up.startswith(DDL_PREFIXES)


def main():
    text = SRC.read_text(encoding='utf-8', errors='ignore')
    out_lines = []
    in_create = False
    paren_depth = 0
    in_do = False

    for line in text.splitlines():
        raw = line.rstrip('\n')
        s = raw.strip()
        up = s.upper()

        # Manejo de bloques DO $$ ... END$$;
        if in_do:
            if 'END$$' in up or up.endswith('END $$;') or up.endswith('END; $$;'):
                in_do = False
            continue  # saltar todo bloque DO
        if up.startswith('DO $$'):
            in_do = True
            continue

        # Detectar inicio de CREATE/ALTER con bloque de paréntesis
        if not in_create:
            if up.startswith('CREATE TABLE') or (up.startswith('ALTER TABLE') and '(' in up and not up.endswith(';')):
                in_create = True
                # estimar profundidad de paréntesis inicial
                paren_depth = up.count('(') - up.count(')')
                continue
            # líneas DDL sueltas
            if should_skip_line(raw):
                continue
            # mantener DML
            if s and any(up.startswith(p) for p in KEEP_PREFIXES):
                out_lines.append(raw)
            else:
                # mantener comentarios y otros no peligrosos
                out_lines.append(raw)
            continue
        else:
            # dentro de bloque CREATE/ALTER multilinea
            paren_depth += up.count('(') - up.count(')')
            # Cerrar cuando la profundidad llegue a <= 0 y se vea ';'
            if paren_depth <= 0 and ';' in up:
                in_create = False
                paren_depth = 0
            continue  # saltar líneas del bloque DDL

    # Escribir archivo limpio
    DST.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')

    # Hacer backup y reemplazar original
    if BAK.exists():
        BAK.unlink()
    SRC.replace(BAK)
    DST.replace(SRC)

    print(f"Limpieza completa. Respaldo: {BAK.name}. Archivo final: {SRC.name}")


if __name__ == '__main__':
    main()
