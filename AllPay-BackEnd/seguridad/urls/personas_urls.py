from django.urls import path
from seguridad.views import personas_views as views


urlpatterns = [

    # Sexo
    path('sexo/get-list/', views.GetSexo.as_view(), name="sexo-get"),

    # Geograficos
    path('paises/get-list/', views.GetPaises.as_view(), name="paises-get"),
    path('departamento/get-list/<str:pk>/', views.GetDepartamento.as_view(), name="departamento-get"),
    path('municipio/get-list/<str:pk>/', views.GetMunicipio.as_view(), name="municipio-get-codDepartamento"),
    path('municipio-cacaotero/get-list/<str:pk>/', views.GetMunicipiosCacaoteros.as_view(), name="municipio-get-codDepartamento-cacaotero"),
    path('departamento-cacaotero/get-list/<str:pk>/', views.GetDepartamentoCacaotero.as_view(), name="departamento-get-cacaotero"),

    # Tipo Documento
    path('tipos-documento/get-list/', views.GetTipoDocumento.as_view(), name="tipo-documento-get"),
    path('tipos-documento/get-by-id/<str:pk>/', views.GetTipoDocumentoById.as_view(), name='tipo-documento-id-get'),
    path('tipos-documento/delete/<str:pk>/', views.DeleteTipoDocumento.as_view(), name='tipo-documento-delete'),
    path('tipos-documento/create/', views.RegisterTipoDocumento.as_view(), name='tipo-documento-register'),
    path('tipos-documento/update/<str:pk>/', views.UpdateTipoDocumento.as_view(), name='estado-civil-update'),
    path('tipos-documento/get-list-register/', views.GetTipoDocumentoRegistro.as_view(), name='tipo-documento-get-register'),

    # Tipo Comprador
    path('tipos-comprador/get-list/', views.GetTipoComprador.as_view(), name="tipo-comprador-get"),
    path('tipos-comprador/get-by-id/<str:pk>/', views.GetTipoCompradorById.as_view(), name='tipo-comprador-id-get'),
    path('tipos-comprador/delete/<str:pk>/', views.DeleteTipoComprador.as_view(), name='tipo-comprador-delete'),
    path('tipos-comprador/create/', views.RegisterTipoComprador.as_view(), name='tipo-comprador-register'),
    path('tipos-comprador/update/<str:pk>/', views.UpdateTipoComprador.as_view(), name='tipo-comprador-update'),

    # PERSONAS
    # - Consultas
    path('get-by-id/<str:pk>/', views.GetPersonasByID.as_view(), name='persona-id-get'),
    path('get-personas-by-document/<str:tipodocumento>/<str:numerodocumento>/', views.GetPersonasByTipoDocumentoAndNumeroDocumento.as_view(), name='persona-by-document-and-tipo-documento-get'),
    path('get-personas-filters/', views.GetPersonasByFilters.as_view(), name='get-personas-filters'),
    path('verificar-persona/', views.VerificarPersonaPorDocumentoView.as_view(), name='verificar-persona'),

    # - Consultas Admin Usuarios
    path('get-personas-by-document-admin-user/<str:tipodocumento>/<str:numerodocumento>/', views.GetPersonasByTipoDocumentoAndNumeroDocumentoAdminUser.as_view(), name='persona-by-document-and-tipo-documento-get-admin-user'),
    path('get-personas-filters-admin-user/', views.GetPersonasByFiltersAdminUser.as_view(), name='get-personas-filters-admin-user'),

    path('get-persona-juridica/representante-legal/',views.GetPersonaJuridicaByRepresentanteLegal.as_view(),name='verify-persona-juridica'),

    # - Registros
    path('persona-natural-and-usuario/create/', views.CreatePersonaNaturalAndUsuario.as_view(), name='persona-natural-and-usuario-create'),
    path('persona-juridica-and-usuario/create/', views.CreatePersonaJuridicaAndUsuario.as_view(), name='persona-juridica-and-usuario-create'),

    # - Actualizaciones
    path('persona-natural/self/update/', views.UpdatePersonaNaturalByself.as_view(), name='persona-natural-update-by-self'),
    path('persona-juridica/self/update/', views.UpdatePersonaJuridicaBySelf.as_view(), name='persona-juridica-update-by-self'),

    path('autorizacion-notificaciones-self/', views.AutorizacionNotificacionesPersonas.as_view(), name='autorizacion-notificaciones-self'),

    #ADMINISTRACIÓ DE PERSONAS
    path('register-persona-natural-admin-personas/', views.RegisterPersonaNaturalAdmin.as_view(), name='register-personal-natural-admin-personas'),
    path('update-persona-natural-admin-personas/<str:id_persona>/', views.UpdatePersonaNaturalAdminPersonas.as_view(), name='update-personal-natural-admin-personas'),
    path('register-persona-juridica-admin-personas/', views.RegisterPersonaJuridicaAdmin.as_view(), name='register-personal-juridica-admin-personas'),
    path('update-persona-juridica-admin-personas/<str:id_persona>/', views.UpdatePersonaJuridicaAdminPersonas.as_view(), name='update-personal-juridica-admin-personas'),

    # Historico Direcciones
    path('historico-direccion/<int:pk>/', views.HistoricoDireccionByIdPersona.as_view(), name="historico-direcciones"),
    path('historico-direccion-create/<int:pk>/', views.HistoricoDireccionByIdPersonaCreate.as_view(), name="historico-direcciones-create"),

    # Historico Representante Legal
    path('historico-representante-legal/<int:id_persona_empresa>/', views.HistoricoRepresentLegalView.as_view(), name="historico-representante"),

    # Cargos
    path('cargos/get-list/', views.GetCargosList.as_view(), name="cargos-get"),
    path('cargos/create/', views.RegisterCargos.as_view(), name='cargos-register'),
    path('cargos/update/<str:pk>/', views.UpdateCargos.as_view(), name='cargos-update'),
    path('cargos/delete/<str:pk>/', views.DeleteCargo.as_view(), name='cargos-delete'),

    # VALIDACION
    path('validacion-token/', views.ValidacionTokenView.as_view(), name='validacion_token'),

    # Documentos
    path('documentos/api/', views.DocumentosPersonaView.as_view(), name="documentos-get"),

    # Representante Legal
    path('crear-representante-legal/', views.RepresentanteLegalCreateView.as_view(), name='crear-representante-legal'),
    path('get-representantes-legales/', views.GetRepresentantesLegalesView.as_view(), name='get-representantes-legales'),

    #Proveedores
    path('proveedores/create/', views.ProovedorCreateView.as_view(), name='proveedores-register'),
    path('proveedores/', views.ProveedoresListView.as_view(), name='proveedores-list'),
    path('proveedores/<str:id_persona>/', views.ProveedorRetrieveView.as_view(), name='proveedores-retrieve'),
    path('proveedores/<str:id_persona>/update/', views.ProveedorUpdateView.as_view(), name='proveedores-update'),
    path('proveedores/<str:id_persona>/delete/', views.ProveedorDeleteView.as_view(), name='proveedores-delete'),

    # Identificacion temporal
    path('identificacion-temporal/', views.IdentificacionTemporalView.as_view(), name='identificacion-temporal'),
    path('identificacion-temporal/update/<str:pk>/', views.UpdateIdentificacionTemporalView.as_view(), name='identificacion-temporal-update'),

    path('persona-firma-documento/', views.PersonaFirmanDocumentosView.as_view(), name='persona-firma-documento'),

    path('obtener-datos-persona-pago/', views.ObtenerDatosPersonaPagoView.as_view(), name='obtener-datos-persona-pago'),
    path('obtener-tipo-comprador-usuario/', views.ObtenerTipoCompradorUsuarioView.as_view(), name='obtener-tipo-comprador-usuario'),
    path('actualizar-tipo-comprador-usuario/', views.ActualizarTipoCompradorUsuarioView.as_view(), name='actualizar-tipo-comprador-usuario'),

    # CRUD Municipios
    path('municipios/', views.MunicipioListCreateView.as_view(), name='municipios-list-create'),
    path('municipios/<str:cod_municipio>/', views.MunicipioRetrieveUpdateDestroyView.as_view(), name='municipios-retrieve-update-destroy'),
    path('municipios/departamento/<str:cod_departamento>/', views.MunicipioByDepartamentoView.as_view(), name='municipios-by-departamento'),

]