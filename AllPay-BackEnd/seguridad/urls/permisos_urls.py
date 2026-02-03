from django.urls import path
from seguridad.views import permisos_views as views

app_name = 'permisos_app'

urlpatterns = [
    #Permisos
    path('get-list/', views.ListarPermisos.as_view(), name='permiso-listar'),
    # path('get-by-id/<pk>/', views.DetailPermisos.as_view(), name='permiso-ver'),

    #Modulo
    path('modulos/get-list/', views.ListarModulo.as_view(),name='mostrar-lista-módulo'),
    # path('modulos/get-by-id/<int:pk>', views.DetailModulo.as_view(),name='consultar-módulo'),

    #PermisosModulo
    # path('permisos-modulos/create/', views.PermisosModulosViewSet.as_view({'post':'create'}), name='permiso-por-modulo-create'),
    path('permisos-modulos/get-list/', views.ListarPermisosModulo.as_view(), name='permisos-modulo-listar'),
    #path('permisos-modulos/get-by-id/<str:pk>', views.DetailPermisosModulo.as_view(), name='permisos-modulo-ver'),

    #PermisosModuloRol
    path('permisos-modulos-rol/create/', views.PermisosModuloRolViewSet.as_view({'post':'create'}), name='permiso-por-modulo-por-rol-create'),
    path('permisos-modulos-rol/update/<pk>/', views.UpdatePermisoModuloRol.as_view(), name='permiso-modulo-rol-update'),    
    path('permisos-modulos-rol/get-list/', views.ListarPermisosModuloRol.as_view(), name='permisos-modulo-rol-listar'),
    # path('permisos-modulos-rol/get-by-id/<pk>/', views.DetailPermisosModuloRol.as_view(), name='permisos-modulo-rol-ver'),
    path('permisos-modulos-rol/get-by-rol/<pk>/', views.ListarPermisosModuloRolByRol.as_view(), name='permisos-modulo-rol-by-rol'),
    path('permisos-rol/get-by-rol/<str:id_rol>/', views.GetPermisosRolByRol.as_view(), name='permisos-rol-by-rol'),
    path('permisos-rol/get-estructura-menu/', views.GetEstructuraMenu.as_view(), name='get-estructura-menu'),
    path('permisos-rol/get-by-entorno/', views.GetPermisosRolByEntorno.as_view(), name='permisos-rol-by-entorno')
]