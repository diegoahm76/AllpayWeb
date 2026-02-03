"""
Script para inicializar la tabla Siesa con datos básicos
"""

from django.core.management.base import BaseCommand
from recaudos.models.recaudos_models import Siesa


class Command(BaseCommand):
    help = 'Inicializa la tabla Siesa con datos básicos'

    def handle(self, *args, **options):
        # Datos iniciales
        siesa_data = [
            {
                "descripcion": "CUOTA DE FOMENTO",
                "auxiliar": "41150301",
                "compania": "02",
                "centro": "025",
                "unidad": "25",
                "sucursal": "010",
                "tipo_documento": "FUN"
            },
            {
                "descripcion": "INTERES CUOTA DE FOMENTO",
                "auxiliar": "41159001",
                "compania": "02",
                "centro": "025",
                "unidad": "25",
                "sucursal": "011",
                "tipo_documento": "FUN"
            },
            {
                "descripcion": "CUOTA DE FOMENTO AP",
                "auxiliar": "13130101",
                "compania": "02",
                "centro": "025",
                "unidad": "",
                "sucursal": "010",
                "tipo_documento": "FUN"
            },
            {
                "descripcion": "INTERES AP",
                "auxiliar": "13139001",
                "compania": "02",
                "centro": "025",
                "unidad": "25",
                "sucursal": "011",
                "tipo_documento": "FUN"
            }
        ]

        created_count = 0
        updated_count = 0

        for data in siesa_data:
            # Convertir unidad vacía a None para la base de datos
            if data['unidad'] == "":
                data['unidad'] = None

            # Verificar si ya existe un registro con la misma descripción
            siesa, created = Siesa.objects.get_or_create(
                descripcion=data['descripcion'],
                defaults=data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Creado: {data["descripcion"]}')
                )
            else:
                # Actualizar si existe
                for key, value in data.items():
                    setattr(siesa, key, value)
                siesa.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'⚠ Actualizado: {data["descripcion"]}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Proceso completado:'
                f'\n   - Registros creados: {created_count}'
                f'\n   - Registros actualizados: {updated_count}'
                f'\n   - Total procesados: {len(siesa_data)}'
            )
        )
