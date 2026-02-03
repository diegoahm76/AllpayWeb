from django.urls import path
from seguridad.views import choices_views as views

urlpatterns = [
    path('subsistemas/', views.SubsistemasChoices.as_view(), name='subsistemas'),
    # path('tipo-direccion/', views.TipoDireccionChoices.as_view(), name='tipo-direccion'),
    path('tipo-persona/', views.TipoPersonaChoices.as_view(), name='tipo-persona'),
    path('tipo-usuario/', views.TipoUsuarioChoices.as_view(), name='tipo-usuario'),
    path('tipo-comprador/', views.TipoCompradorChoices.as_view(), name='tipo-comprador'),
    # path('direcciones/', views.DireccionesChoices.as_view(), name='direcciones'),
    path('cod-naturaleza-empresa/', views.CodNaturalezaEmpresaChoices.as_view(), name='cod-naturaleza-empresa'),

    path('nivel-prioridad/', views.NivelPrioridadChoices.as_view(), name='nivel-prioridad'),
    path('tipo-perfil/', views.CodTipoPerfilChoices.as_view(), name='tipo-perfil'),
]