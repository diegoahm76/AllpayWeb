from django.core.management.base import BaseCommand
from recaudos.models.recaudos_models import Pagos


class Command(BaseCommand):
    help = 'Intercambia CUS y Ticket de pagos que fueron guardados con los valores invertidos'

    def add_arguments(self, parser):
        parser.add_argument('id_pago', type=int, help='ID del pago a corregir')

    def handle(self, *args, **options):
        id_pago = options['id_pago']

        try:
            pago = Pagos.objects.get(id_pago=id_pago)
            
            self.stdout.write(f"\nPago {id_pago}:")
            self.stdout.write(f"  CUS actual: {pago.cus}")
            self.stdout.write(f"  Ticket actual: {pago.ticket_id}")
            
            # Intercambiar
            temp = pago.cus
            pago.cus = pago.ticket_id
            pago.ticket_id = temp
            pago.save()
            
            self.stdout.write(self.style.SUCCESS(f"\nIntercambiados correctamente:"))
            self.stdout.write(f"  CUS nuevo: {pago.cus}")
            self.stdout.write(f"  Ticket nuevo: {pago.ticket_id}\n")

        except Pagos.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"ERROR: No se encontro el pago con ID={id_pago}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERROR: {e}"))

