from django.urls import path
from seguridad.views import roles_views as views

urlpatterns = [
    path('get-list/', views.GetRol.as_view(), name='roles'),
    path('get-list-rol-sistema/', views.GetAllUsersByRoles.as_view(), name='roles-sistema'),
    # path('get-by-id/<int:pk>/', views.GetRolById.as_view(), name='rol-id'),
    # path('get-by-name/', views.GetRolByName.as_view(), name='rol-name'),
    path('create/', views.RegisterRol.as_view(), name='rol-register'),
    path('update/<int:pk>/', views.UpdateRol.as_view(), name='rol-update'),
    path('delete/<int:id_rol>/', views.DeleteRol.as_view(), name='rol-delete'),
    # path('delete_rol_de_usuario/<int:pk>/', views.DeleteUserRol.as_view(), name='rol-delete'),
    # path('detail_roles_usuario/', views.GetRolesByUser.as_view(), name='roles-por-usuario-ver'),
    path('detail_usuarios_rol/<str:id_rol>/', views.GetUsersByRol.as_view(), name='usuarios-por-rol-ver'),
    path('get-roles-by-id-usuario/<str:id_usuario>/', views.GetRolesByIdPersona.as_view(), name='get-roles-by-id-usuario'),
    path('get-roles-y-permisos-usuario/', views.GetRolesYPermisosUsuario.as_view(), name='get-roles-y-permisos-usuario'),
    path('get-roles-by-persona/<int:id_persona>/', views.GetRolesByPersona.as_view(), name='get-roles-by-persona'),
    path('update-role-by-persona/<int:id_persona>/', views.UpdateRolesByPersona.as_view(), name='update-role-by-persona'),
    path('auditorias/actualizaciones/<int:id_persona>/', views.GetAuditoriasByPersona.as_view(),name='auditorias-actualizaciones'),
    path('usuarios/actualizar-estado/<int:id_persona>/', views.UpdateUserStatusByPersona.as_view(),name='actualizar-estado-usuario'),
    path('usuarios/actualizar-tipo-usuario/<int:id_persona>/', views.UpdateUserTipoUsuario.as_view(),name='actualizar-tipo-usuario'),
    path('usuarios/get-tipo-usuario/<int:id_persona>/', views.GetUserDetailsByPersona.as_view(),name='get-tipo-usuario'),

]