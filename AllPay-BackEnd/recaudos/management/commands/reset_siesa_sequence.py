"""
Comando para resetear la secuencia de la tabla Siesa
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Max
from recaudos.models.recaudos_models import Siesa


class Command(BaseCommand):
    help = 'Resetea la secuencia de la tabla Siesa para evitar conflictos de ID'

    def handle(self, *args, **options):
        try:
            # Obtener el ID máximo actual
            max_id = Siesa.objects.aggregate(max_id=Max('id'))['max_id'] or 0
            
            # Resetear la secuencia
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT setval('siesa_id_seq', {max_id + 1});")
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Secuencia de Siesa reseteada. Próximo ID será: {max_id + 1}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error al resetear la secuencia: {str(e)}')
            )
