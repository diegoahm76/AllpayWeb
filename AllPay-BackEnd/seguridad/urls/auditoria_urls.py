from django.urls import path
from seguridad.views import auditorias_views as views

urlpatterns = [
    #Auditoria
    path('get-list/', views.ListApiViews.as_view(),name='mostrar-lista-auditoría'),
    # path('get-by-query-params/', views.getAuditorias,name='consultar-auditoria'),
    # path('create/', views.AuditoriaCreateView.as_view(),name='auditoria-create')

]