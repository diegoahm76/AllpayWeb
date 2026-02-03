"""
Comando para resetear la secuencia de la tabla Pagos
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Max
from recaudos.models.recaudos_models import Pagos


class Command(BaseCommand):
    help = 'Resetea la secuencia de la tabla Pagos para evitar conflictos de ID'

    def handle(self, *args, **options):
        try:
            # Obtener el ID máximo actual
            max_id = Pagos.objects.aggregate(max_id=Max('id_pago'))['max_id'] or 0
            
            self.stdout.write(f'ID máximo actual en tabla Pagos: {max_id}')
            
            # Resetear la secuencia
            with connection.cursor() as cursor:
                # El nombre de la secuencia en PostgreSQL para la tabla Pagos
                cursor.execute(f'SELECT setval(\'"Pagos_IdPago_seq"\', {max_id + 1});')
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Secuencia de Pagos reseteada. Próximo ID será: {max_id + 1}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error al resetear la secuencia: {str(e)}')
            )

