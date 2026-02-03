from django.core.management.base import BaseCommand
from django.db import transaction
from reportes.models import RendimientoCensoDepartamento
from seguridad.models.transversal_models import Departamento


class Command(BaseCommand):
    help = 'Poblar la tabla RendimientoCensoDepartamento con datos de ejemplo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Limpiar datos existentes antes de poblar',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Limpiando datos existentes...')
            RendimientoCensoDepartamento.objects.all().delete()

        # Datos reales del censo con códigos de departamento
        datos_rendimiento = {
            '91': {'nombre': 'AMAZONAS', 'rendimiento': 448.17},
            '05': {'nombre': 'ANTIOQUIA', 'rendimiento': 434.52},
            '81': {'nombre': 'ARAUCA', 'rendimiento': 418.45},
            '08': {'nombre': 'ATLÁNTICO', 'rendimiento': 448.17},
            '13': {'nombre': 'BOLÍVAR', 'rendimiento': 448.17},
            '15': {'nombre': 'BOYACÁ', 'rendimiento': 448.17},
            '17': {'nombre': 'CALDAS', 'rendimiento': 417.53},
            '18': {'nombre': 'CAQUETÁ', 'rendimiento': 448.17},
            '85': {'nombre': 'CASANARE', 'rendimiento': 448.17},
            '19': {'nombre': 'CAUCA', 'rendimiento': 448.17},
            '20': {'nombre': 'CESAR', 'rendimiento': 392.00},
            '27': {'nombre': 'CHOCÓ', 'rendimiento': 448.17},
            '23': {'nombre': 'CÓRDOBA', 'rendimiento': 448.17},
            '25': {'nombre': 'CUNDINAMARCA', 'rendimiento': 324.00},
            '94': {'nombre': 'GUAINÍA', 'rendimiento': 448.17},
            '95': {'nombre': 'GUAVIARE', 'rendimiento': 471.00},
            '41': {'nombre': 'HUILA', 'rendimiento': 414.28},
            '44': {'nombre': 'LA GUAJIRA', 'rendimiento': 448.17},
            '47': {'nombre': 'MAGDALENA', 'rendimiento': 448.17},
            '50': {'nombre': 'META', 'rendimiento': 406.00},
            '52': {'nombre': 'NARIÑO', 'rendimiento': 439.00},
            '54': {'nombre': 'NORTE DE SANTANDER', 'rendimiento': 460.00},
            '86': {'nombre': 'PUTUMAYO', 'rendimiento': 413.00},
            '63': {'nombre': 'QUINDÍO', 'rendimiento': 448.17},
            '66': {'nombre': 'RISARALDA', 'rendimiento': 448.17},
            '68': {'nombre': 'SANTANDER', 'rendimiento': 471.80},
            '70': {'nombre': 'SUCRE', 'rendimiento': 448.17},
            '73': {'nombre': 'TOLIMA', 'rendimiento': 410.22},
            '76': {'nombre': 'VALLE DEL CAUCA', 'rendimiento': 448.17},
            '97': {'nombre': 'VAUPÉS', 'rendimiento': 448.17},
            '99': {'nombre': 'VICHADA', 'rendimiento': 448.17},
        }

        creados = 0
        actualizados = 0

        with transaction.atomic():
            for cod_departamento, datos in datos_rendimiento.items():
                try:
                    departamento = Departamento.objects.get(cod_departamento=cod_departamento)
                    
                    rendimiento_obj, created = RendimientoCensoDepartamento.objects.get_or_create(
                        departamento=departamento,
                        defaults={'rendimiento_censo': datos['rendimiento']}
                    )
                    
                    if not created:
                        rendimiento_obj.rendimiento_censo = datos['rendimiento']
                        rendimiento_obj.save()
                        actualizados += 1
                        self.stdout.write(
                            f'Actualizado: {datos["nombre"]} ({cod_departamento}) - {datos["rendimiento"]} kg/ha'
                        )
                    else:
                        creados += 1
                        self.stdout.write(
                            f'Creado: {datos["nombre"]} ({cod_departamento}) - {datos["rendimiento"]} kg/ha'
                        )
                        
                except Departamento.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Departamento no encontrado: {datos["nombre"]} ({cod_departamento})'
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nProceso completado:\n'
                f'- {creados} registros creados\n'
                f'- {actualizados} registros actualizados\n'
                f'- Total departamentos procesados: {creados + actualizados}'
            )
        )
