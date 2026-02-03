from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from recaudos.models.recaudos_models import Pagos
from recaudos.integrations.zonapagos_soap import verificacion_pago_soap
from recaudos.views.pagos_zonapagos_views import VerificarPagoRESTView
from recaudos.integrations.zonapagos_utils import ESTADOS_PEND

class Command(BaseCommand):
    help = "Sonda pagos pendientes ZonaPagos"

    def handle(self, *args, **opts):
        hace_7 = timezone.now() - timedelta(minutes=7)
        qs = Pagos.objects.filter(
            cod_estado_pago__in=ESTADOS_PEND, 
            fecha_estado_pago__lte=hace_7,
            cod_pago_realizado__startswith="ZONAPAGOS-"
        )
        
        ID_COMERCIO = settings.ZPAGOS["ID_COMERCIO"]
        USR = settings.ZPAGOS["USUARIO"]
        PWD = settings.ZPAGOS["CLAVE"]
        asentar = VerificarPagoRESTView()._asentar

        self.stdout.write(f"Sondeando {qs.count()} pagos pendientes...")

        for p in qs:
            try:
                # Usar el ID que enviamos a ZonaPagos (str_id_pago_zp) o fallback al id_pago
                id_pago_buscar = p.str_id_pago_zp or str(p.id_pago)
                
                # Usar SOAP para verificar
                resp = verificacion_pago_soap(
                    int_id_comercio=str(ID_COMERCIO),
                    str_usr_comercio=USR,
                    str_pwd_Comercio=PWD,
                    str_id_pago=id_pago_buscar,
                    int_no_pago=-1
                )
                
                if not resp["success"]:
                    self.stdout.write(f"Error en pago {p.id_pago}: {resp.get('error', 'Sin respuesta')}")
                    continue
                
                # Los pagos ya vienen parseados en la respuesta SOAP
                pagos = resp.get("res_pago", [])
                
                # Guardar respuesta raw para debugging
                try:
                    p.raw_respuesta = str(resp)
                    p.save(update_fields=["raw_respuesta"])
                except Exception:
                    pass
                
                asentar(id_pago_buscar, pagos)
                self.stdout.write(f"Pago {p.id_pago} actualizado - Estado: {pagos[0].get('int_estado_pago') if pagos else 'N/A'}")
            except Exception as e:
                self.stdout.write(f"Error en pago {p.id_pago}: {e}")

        self.stdout.write(self.style.SUCCESS("Sondeo completado")) 