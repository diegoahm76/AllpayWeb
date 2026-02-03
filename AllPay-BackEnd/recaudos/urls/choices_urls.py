from django.urls import path
from recaudos.views import choices_views as views

urlpatterns = [

    path('cod-tipo-cobro/', views.CodigoTipoCobro.as_view(), name='cod-naturaleza-empresa'),
    path('cod-estado/', views.CodigoEstado.as_view(), name='cod-naturaleza-empresa'),
    path('cod-tipo-cargue/', views.CodigoTipoCargue.as_view(), name='cod-tipo-cargue'),
    path('cod-tipo-paz-y-salvo/', views.CodigoTipoPazySalvo.as_view(), name='cod-tipo-paz-y-salvo'),
    path('cod-estado-acuerdos-pago/', views.CodigoEstadoAcuerdoPago.as_view(), name='cod-estado-acuerdos-pago'),
    path('cod-estado-factura-unica/', views.CodigoEstadoFacturaUnica.as_view(), name='cod-estado-factura-unica'),

    
]