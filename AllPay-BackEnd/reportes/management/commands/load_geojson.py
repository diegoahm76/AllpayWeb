import json
import sys
from urllib.parse import urlparse

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db import models
from reportes.models import Department, Municipality  # ajustado para la app reportes

# Si quieres permitir URLs:
try:
    import requests
except Exception:
    requests = None


def _read_json(path_or_url: str):
    """
    Lee JSON desde un archivo local o una URL (raw GitHub, etc.).
    Acepta también .txt con contenido JSON.
    """
    parsed = urlparse(path_or_url)
    if parsed.scheme in ("http", "https"):
        if not requests:
            raise CommandError("Instala requests para leer URLs: pip install requests")
        r = requests.get(path_or_url, timeout=60)
        r.raise_for_status()
        return r.json()
    else:
        with open(path_or_url, "r", encoding="utf-8") as f:
            return json.load(f)


class Command(BaseCommand):
    help = "Carga Departamentos y Municipios desde GeoJSON del IGAC/DANE"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dept",
            required=True,
            help="Ruta o URL del GeoJSON de departamentos (co_2018_MGN_DPTO_POLITICO.geojson o .txt).",
        )
        parser.add_argument(
            "--mun",
            required=True,
            help="Ruta o URL del GeoJSON de municipios (co_2018_MGN_MPIO_POLITICO.geojson o .txt).",
        )
        parser.add_argument(
            "--truncate",
            action="store_true",
            help="Opcional: vacía tablas antes de cargar.",
        )

    def handle(self, *args, **opts):
        dept_src = opts["dept"]
        mun_src = opts["mun"]
        truncate = opts["truncate"]

        # 1) Leer fuentes
        self.stdout.write(self.style.MIGRATE_HEADING("Leyendo GeoJSON de Departamentos…"))
        dept_geo = _read_json(dept_src)
        self.stdout.write(self.style.MIGRATE_HEADING("Leyendo GeoJSON de Municipios…"))
        mun_geo = _read_json(mun_src)

        # Validaciones mínimas
        for tag, data in (("Departamentos", dept_geo), ("Municipios", mun_geo)):
            if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
                raise CommandError(f"{tag}: formato inválido (se espera FeatureCollection).")
            if "features" not in data or not isinstance(data["features"], list):
                raise CommandError(f"{tag}: no hay 'features' lista.")

        if truncate:
            self._truncate()

        # 2) Cargar Departamentos
        self._load_departments(dept_geo)

        # 3) Cargar Municipios
        self._load_municipalities(mun_geo)

        self.stdout.write(self.style.SUCCESS("✅ Carga finalizada con éxito."))

    def _truncate(self):
        self.stdout.write(self.style.WARNING("Truncando tablas Municipality y Department…"))
        with transaction.atomic():
            Municipality.objects.all().delete()
            Department.objects.all().delete()

    @transaction.atomic
    def _load_departments(self, dept_geo):
        """
        Crea/actualiza Department (PK=code) desde properties:
          - DPTO_CCDGO (str)
          - DPTO_CNMBR (str)
        Usa bulk upsert si tu Django ≥ 5.1.
        """
        feats = dept_geo["features"]
        depts = []
        for ft in feats:
            props = ft.get("properties", {}) or {}
            code = str(props.get("DPTO_CCDGO", "")).strip()
            name = str(props.get("DPTO_CNMBR", "")).strip()
            if not code or not name:
                # omite features sin data
                continue
            # Normaliza mayúsculas, quita dobles espacios
            name = " ".join(name.split())
            depts.append(Department(code=code, name=name))

        if not depts:
            self.stdout.write(self.style.WARNING("No se encontraron departamentos válidos."))
            return

        # Upsert por code (PK). Requiere Django 5.1+ para update_conflicts.
        try:
            Department.objects.bulk_create(
                depts,
                update_conflicts=True,
                update_fields=["name"],
                unique_fields=["code"],
            )
            self.stdout.write(self.style.SUCCESS(f"Departamentos upsert: {len(depts)}"))
        except TypeError:
            # Fallback si tu versión no soporta update_conflicts
            self.stdout.write(self.style.WARNING("bulk upsert no disponible; usando update_or_create…"))
            created, updated = 0, 0
            for d in depts:
                obj, was_created = Department.objects.update_or_create(
                    code=d.code, defaults={"name": d.name}
                )
                created += 1 if was_created else 0
                updated += 0 if was_created else 1
            self.stdout.write(self.style.SUCCESS(f"Departamentos creados: {created}, actualizados: {updated}"))

    @transaction.atomic
    def _load_municipalities(self, mun_geo):
        """
        Crea/actualiza Municipality desde properties:
          - DPTO_CCDGO (str) → FK a Department(code)
          - MPIO_CCDGO (str, 3 dígitos)
          - MPIO_CNMBR (str)
        Upsert por (department_id, code).
        """
        feats = mun_geo["features"]

        # Cache de departamentos existentes (para validar FK)
        dept_codes = set(Department.objects.values_list("code", flat=True))

        municipalities = []
        skipped_missing_dept = 0

        for ft in feats:
            props = ft.get("properties", {}) or {}
            dpto = str(props.get("DPTO_CCDGO", "")).strip()
            mcode = str(props.get("MPIO_CCDGO", "")).strip()
            mname = str(props.get("MPIO_CNMBR", "")).strip()
            if not dpto or not mcode or not mname:
                continue
            mname = " ".join(mname.split())

            if dpto not in dept_codes:
                # Si algún municipio llega con dpto inexistente, lo saltamos (o podrías crear el dpto en caliente).
                skipped_missing_dept += 1
                continue

            municipalities.append(
                Municipality(
                    department_id=dpto,  # setea la FK por su valor crudo
                    code=mcode,
                    name=mname,
                )
            )

        if not municipalities:
            self.stdout.write(self.style.WARNING("No se encontraron municipios válidos."))
            return

        # Upsert compuesto (department_id, code) con Django 5.1+
        try:
            Municipality.objects.bulk_create(
                municipalities,
                update_conflicts=True,
                update_fields=["name"],
                unique_fields=["department_id", "code"],
            )
            self.stdout.write(self.style.SUCCESS(f"Municipios upsert: {len(municipalities)}"))
        except TypeError:
            # Fallback si no hay update_conflicts
            self.stdout.write(self.style.WARNING("bulk upsert no disponible; usando get_or_create/update…"))
            created, updated = 0, 0
            # Usa índice/constraint único (department, code)
            for m in municipalities:
                obj, was_created = Municipality.objects.get_or_create(
                    department_id=m.department_id,
                    code=m.code,
                    defaults={"name": m.name},
                )
                if was_created:
                    created += 1
                elif obj.name != m.name:
                    obj.name = m.name
                    obj.save(update_fields=["name"])
                    updated += 1
            self.stdout.write(self.style.SUCCESS(f"Municipios creados: {created}, actualizados: {updated}"))

        if skipped_missing_dept:
            self.stdout.write(
                self.style.WARNING(
                    f"Municipios omitidos por faltar su departamento: {skipped_missing_dept}"
                )
            )
