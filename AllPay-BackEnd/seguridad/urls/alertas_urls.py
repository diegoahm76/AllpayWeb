from django.urls import path
from seguridad.views import alertas_views as views

urlpatterns = [
    path('get-bandeja-by-persona/', views.BandejaAlertaPersonaGetByPersona.as_view(),name='mostrar-bandeja-alertas-por-persona-id'),
    path('get-alertas-by-bandeja/<int:id_bandeja>/', views.AlertasBandejaAlertaPersonaGetByBandeja.as_view(),name='mostrar-alertas-por-bandeja-id'),
    path('configuracion-clase-alerta/', views.ConfiguracionClaseAlertaView.as_view(),name='mostrar-configuracion-clase-alerta'),
    path('configuracion-clase-alerta/<str:pk>/', views.ConfiguracionClaseAlertaView.as_view(),name='actualizar-configuracion-clase-alerta'),
    path('personas-a-alertar/', views.PersonasAAlertarView.as_view(),name='crear-personas-a-alertar'),
    path('personas-a-alertar/<str:cod>/', views.PersonasAAlertarView.as_view(),name='actualizar-personas-a-alertar'),
    path('fecha-clase-alerta/', views.FechaClaseAlertaView.as_view(),name='crear-fecha-clase-alerta'),
    path('fecha-clase-alerta/<str:cod>/', views.FechaClaseAlertaView.as_view(),name='actualizar-fecha-clase-alerta'),
    path('marcar-alertas-como-leidas/', views.MarcarAlertasComoLeidas.as_view(),name='marcar-alertas-como-leidas'),
]