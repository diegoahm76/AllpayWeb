from django.core.management.base import BaseCommand
from django.utils import timezone
from recaudos.models.recaudos_models import Pagos, FacturaUnica


class Command(BaseCommand):
    help = 'Actualiza un pago existente con str_id_pago_zp y opcionalmente lo refinaliza'

    def add_arguments(self, parser):
        parser.add_argument('id_pago', type=int, help='ID del pago a actualizar')
        parser.add_argument('str_id_pago_zp', type=str, help='Valor de str_id_pago_zp a establecer')
        parser.add_argument('--refinalizar', action='store_true', help='Refinalizar documentos si es estado final')

    def handle(self, *args, **options):
        id_pago = options['id_pago']
        str_id_pago_zp = options['str_id_pago_zp']
        refinalizar = options.get('refinalizar', False)

        self.stdout.write("\n" + "="*80)
        self.stdout.write(f"ACTUALIZANDO PAGO {id_pago}")
        self.stdout.write("="*80 + "\n")

        try:
            pago = Pagos.objects.get(id_pago=id_pago)
            self.stdout.write(self.style.SUCCESS(f"Pago encontrado: ID={pago.id_pago}"))
            self.stdout.write(f"   Estado actual: {pago.cod_estado_pago}")
            self.stdout.write(f"   str_id_pago_zp actual: {pago.str_id_pago_zp}")
            self.stdout.write(f"   int_no_pago actual: {pago.int_no_pago}\n")

            # Actualizar str_id_pago_zp
            pago.str_id_pago_zp = str_id_pago_zp
            pago.save()

            self.stdout.write(self.style.SUCCESS(f"Campo str_id_pago_zp actualizado a: {str_id_pago_zp}\n"))

            # Mostrar informacion actualizada
            pago.refresh_from_db()
            self.stdout.write("INFORMACION ACTUALIZADA DEL PAGO:")
            self.stdout.write(f"   id_pago: {pago.id_pago}")
            self.stdout.write(f"   str_id_pago_zp: {pago.str_id_pago_zp}")
            self.stdout.write(f"   int_no_pago: {pago.int_no_pago}")
            self.stdout.write(f"   cod_estado_pago: {pago.cod_estado_pago}")
            self.stdout.write(f"   valor_pagado: {pago.valor_pagado}")
            self.stdout.write(f"   cus: {pago.cus}")
            self.stdout.write(f"   ticket_id: {pago.ticket_id}\n")

            # Mostrar liquidacion asociada
            if pago.id_liquidacion_pago:
                liq = pago.id_liquidacion_pago
                self.stdout.write("LIQUIDACION ASOCIADA:")
                self.stdout.write(f"   id: {liq.id_liq_factura_unica}")
                self.stdout.write(f"   estado: {liq.cod_estado}")
                self.stdout.write(f"   nro_doc_pago: {liq.nro_doc_pago}")
                self.stdout.write(f"   valor_pagar: {liq.valor_pagar}")
                self.stdout.write(f"   fecha_pago: {liq.fecha_pago}\n")

                # Mostrar facturas asociadas
                try:
                    facturas = liq.facturaunica_set.all()
                    if facturas.exists():
                        self.stdout.write("FACTURAS ASOCIADAS:")
                        for f in facturas:
                            self.stdout.write(f"   - Factura {f.nro_factura_unica}: estado={f.estado_factura}, valor={f.valor_neto}")
                    else:
                        self.stdout.write(self.style.WARNING("No hay facturas asociadas a esta liquidacion"))
                except AttributeError:
                    facturas = FacturaUnica.objects.filter(id_liq_factura_unica=liq)
                    if facturas.exists():
                        self.stdout.write("FACTURAS ASOCIADAS:")
                        for f in facturas:
                            self.stdout.write(f"   - Factura {f.nro_factura_unica}: estado={f.estado_factura}, valor={f.valor_neto}")
                    else:
                        self.stdout.write(self.style.WARNING("No hay facturas asociadas a esta liquidacion"))

                # Refinalizar si se solicita
                if refinalizar and pago.cod_estado_pago in ['1', 'AP']:  # Estados aprobados
                    self.stdout.write("\n" + "="*80)
                    self.stdout.write("REFINALIZANDO DOCUMENTOS...")
                    self.stdout.write("="*80 + "\n")
                    
                    from recaudos.views.pagos_zonapagos_views import _finalizar_documentos
                    _finalizar_documentos(pago)
                    
                    # Refrescar para mostrar cambios
                    liq.refresh_from_db()
                    self.stdout.write(f"\n   Estado liquidacion despues: {liq.cod_estado}")
                    self.stdout.write(f"   Fecha pago: {liq.fecha_pago}")
                    
            else:
                self.stdout.write(self.style.WARNING("El pago no tiene liquidacion asociada"))

            self.stdout.write("\n" + "="*80)
            self.stdout.write(self.style.SUCCESS("ACTUALIZACION COMPLETADA"))
            self.stdout.write("="*80)
            self.stdout.write("\nAhora puedes ejecutar la verificacion con:")
            self.stdout.write(f"   GET /apii/recaudos/pagos/zonapagos/verificar/?id_pago={str_id_pago_zp}&idcomercio=35069\n")

        except Pagos.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"ERROR: No se encontro el pago con ID={id_pago}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERROR al actualizar: {e}"))
            import traceback
            traceback.print_exc()

