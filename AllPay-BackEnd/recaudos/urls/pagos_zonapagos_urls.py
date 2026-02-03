from django.urls import path
from recaudos.views.pagos_zonapagos_views import (
    IniciarPagoRESTView, VerificarPagoRESTView, NotificarPagoRESTView
)

urlpatterns = [
    path("zonapagos/iniciar/", IniciarPagoRESTView.as_view(), name="zp-iniciar"),
    path("zonapagos/verificar/", VerificarPagoRESTView.as_view(), name="zp-verificar"),
    path("zonapagos/notificar/", NotificarPagoRESTView.as_view(), name="zp-notificar"),
] 