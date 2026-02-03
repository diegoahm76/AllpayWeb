from django.urls import path, include
from recaudos.views import recaudos_views as views
from recaudos.views import consulta_facturas_views as views_facturas
from recaudos.views import pagos_views as views_pagos


urlpatterns = [

    #Tipos de Cacao
    path('tipos-cacao/', views.TiposCacaoGetCreateView.as_view(), name='tipos-cacao-register-get'),
    path('tipos-cacao/<int:pk>/', views.UpdateDeleteTiposCacao.as_view(), name='update-delete-tipos-cacao'),
    path('tipos-cacao-activo/', views.GetTiposCacaoActivosView.as_view(), name='tipos-cacao-activo-get'),

    #Fechas de cierre
    path('fechas-cierre/', views.FechasCierreGetCreateView.as_view(), name='fechas-cierre-register-get'),
    path('fechas-cierre/<int:pk>/', views.UpdateFechasCierreView.as_view(), name='update-delete-fechas-cierre'),
    path('fechas-cierre-all/', views.FechasCierreGetView.as_view(), name='fechas-cierre-all-get'),

    #porcentaje de cobro
    path('porcentaje-cobro/', views.PorcentajesCobroGetCreateView.as_view(), name='porcentaje-cobro-register-get'),
    path('porcentaje-cobro/<int:pk>/', views.UpdateDeletePorcentajesCobro.as_view(), name='porcentajes-cobro-update-delete'),
    path('porcentaje-cobro-all/', views.PorcentajesCobroGetViewAll.as_view(), name='porcentaje-cobro-all-get'),

    #Historial de porcentajes de cobro
    path('historial-porcentaje-cobro/', views.HistorialPorcentajesCobroGetView.as_view(), name='historial-porcentaje-cobro-get'),

    #Obtener proveedores y recaudadores
    path('get-proveedores/', views.ProveedoresListView.as_view(), name='proveedores-list'),
    path('get-recaudadores/', views.RecaudadoresListView.as_view(), name='recaudadores-list'),
    
    #Registro de compras de cacao
    path('factura-unica-user-interno/create/', views.CreateFacturaUnicaAndDetallesInterno.as_view(), name='crear-factura-unica-interno'),
    path('factura-unica-user-externo/create/', views.CreateFacturaUnicaAndDetallesExterno.as_view(), name='crear-factura-unica-externo'),

    #Editar factura unica
    path('factura-unica-user-interno/update/<int:id_factura_unica>/', views.UpdateFacturaUnicaAndDetallesInterno.as_view(), name='update-factura-unica-interno'),
    path('factura-unica-user-externo/update/<int:id_factura_unica>/', views.UpdateFacturaUnicaAndDetallesExterno.as_view(), name='update-factura-unica-externo'),

    #Consulta de compras
    path('facturas-recaudadores/all/', views.GetAllFacturasView.as_view()),#interno
    path('facturas-recaudador/<int:pk>/', views.GetFacturasByRecaudador.as_view(), name='get-facturas-recaudador'),#interno
    path('facturas-recaudador-externo/', views.GetFacturasByRecaudadorExterno.as_view(), name='get-facturas-externo-recaudador'),#externo
    path('facturas-por-cargue/<uuid:uuid_cargue>/', views.GetFacturasByCargueUUID.as_view(), name='facturas-por-cargue'),
    path('factura-detalles/<int:id_factura_unica>/', views.GetFacturaDetalles.as_view(), name='get_factura_detalles'),
    path('consulta/facturas-unicas/', views_facturas.ConsultaFacturasUnicasView.as_view(), name='consulta-facturas-unicas'),
    path('compras-totales/', views.ComprasTotalesView.as_view(), name='compras-totales'),  # Totales de compras

    #Registro masivo de compras
    path('factura-unica-cargue-masivo-interno/create/', views.CargueMasivoFacturaUnicaInternoView.as_view(), name='bulk-create-factura-unica-interno'),
    path('factura-unica-cargue-masivo-externo/create/', views.CargueMasivoFacturaUnicaExternoView.as_view(), name='bulk-create-factura-unica-externo'),

    #Liquidacion de compras
    path('liquidacion-compras-interno/', views.CreateLiquidacionInternoView.as_view(), name='liquidacion-compras-interno'),
    path('liquidacion-compras-externo/', views.CreateLiquidacionExternoView.as_view(), name='liquidacion-compras-externo'),
    path('liquidacion-documento/', views.GetLiquidacionDocumentoView.as_view(), name='liquidacion-documento'),#externo
    path('liquidacion-documento-interno/', views.GetLiquidacionDocumentoInternoView.as_view(), name='liquidacion-documento'),#interno

    #Solicitud de Acuerdos de pago
    path('acuerdos-pago/usuario-logueado/', views.GetDatosPersonaLogueadaView.as_view(), name='acuerdos-pago-usuario-logueado'),
    path('acuerdos-pago/factura-no-pagadas/', views.FacturasNoPagadasView.as_view(), name='acuerdos-pago-factura-no-pagadas'),
    path('acuerdos-pago/factura-pagadas/', views.FacturasPagadasView.as_view(), name='acuerdos-pago-factura-pagadas'),
    path('acuerdos-pago/get/solicitud-acuerdo-pago/', views.SolicitudAcuerdoPagoPreviewView.as_view(), name='acuerdos-pago-solicitud-get'),
    path('acuerdos-pago/create/solicitud-acuerdo-pago/', views.CreateSolicitudAcuerdoPagoView.as_view(), name='acuerdos-pago-solicitud-post'),

    #Consulta de acuerdo de pago
    path('acuerdos-pago/externo/consulta-acuerdo-pago/', views.ConsultaSolicitudesAcuerdosPagoExterno.as_view(), name='consulta-acuerdos-pago-externo'),#externo
    path('acuerdos-pago/externo/detalles-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/',views.ConsultaDetallesAcuerdoPagoExterno.as_view(),name='detalles-acuerdos-pago-externo'), #externo
    path('acuerdos-pago/externo/ventana-emergente-detalles-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.InfoVentanaEmergenteConsultaExternoView.as_view(), name='consulta-planes-pago-externo'),#externo
    path('acuerdos-pago/externo/consulta-planes-pago/',views.ConsultaPlanesPagoExterno.as_view(), name='consulta-planes-pago-externo'),#externo
    path('acuerdos-pago/externo/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoExterno.as_view(), name='documento-planes-pago-externo'),#externo

    path('acuerdos-pago/interno/consulta-acuerdo-pago/', views.ConsultaSolicitudesAcuerdosPagoInterno.as_view(), name='consulta-acuerdos-pago-interno'),#interno
    path('acuerdos-pago/interno/detalles-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/',views.ConsultaDetallesAcuerdoPagoInterno.as_view(),name='detalles-acuerdos-pago-interno'), #interno
    path('acuerdos-pago/interno/ventana-emergente-detalles-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.InfoVentanaEmergenteConsultaInternoView.as_view(), name='consulta-planes-pago-interno'),#interno
    path('acuerdos-pago/interno/consulta-planes-pago/<id_persona_solicita>/',views.ConsultaPlanesPagoInterno.as_view(), name='consulta-planes-pago-interno'),#interno
    path('acuerdos-pago/interno/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoInterno.as_view(), name='documento-planes-pago-externo'),#interno

    #Gestionar acuerdo de pago
    path('acuerdos-pago/gestionar-acuerdo-pago/<int:id_persona_solicita>/',views.ConsultaSolicitudesGestionar.as_view(),name='gestionar-acuerdo-pago'),
    path('acuerdos-pago/info-acuerdo-pago-crear/<int:id_solicitud>/',views.InfoCreacionPlanPagoNuevo.as_view(),name='info-acuerdo-pago-actual-get'),
    path('acuerdos-pago/info-acuerdo-pago-agregar-cuota/<int:id_solicitud>/',views.InfoPlanDePagoAgregarCuota.as_view(),name='info-acuerdo-pago-futuro-get'),
    path('acuerdos-pago/facturas-x-solicitud/<int:id_solicitud>/',views.FacturasPorSolicitudView.as_view(),name='gestionar-acuerdo-pago-factura'),
    path('acuerdos-pago/crear-plan-acuerdo-pago/',views.CrearPlanDePagoView.as_view(),name='crear-acuerdo-pago-post'),
    path('acuerdos-pago/actualizar-cuota/<int:id_cuota_acuerdo_pago>/', views.ActualizarCuotaPlanDePagoView.as_view(), name='actualizar-cuota-plan-pago'),
    path('acuerdos-pago/eliminar-cuota-plan-pago/<id_cuota_acuerdo_pago>/',views.EliminarCuotaPlanPagoView.as_view(),name='eliminar-cuota-pago-delete'),
    path('acuerdos-pago/agregar-factura-cuota/', views.AgregarFacturaACuotaView.as_view(), name='agregar-factura-cuota'),
    path('acuerdos-pago/obtener-plan-acuerdo-pago-por-solicitud/<int:id_solicitud_acuerdo_pago>/',views.GetPlanesPagoPorSolicitudView.as_view(),name='obtener-plan-pago-por-solicitud-get'),
    path('acuerdos-pago/obtener-detalles-plan-pago/<int:id_solicitud_acuerdo_pago>/',views.ConsultadDetallesPlanesPagoGestionar.as_view(),name='obtener-detalles-pago-por-plan-pago-get'),
    path('acuerdos-pago/documento-planes-pago-gestionar/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoInternoGestionar.as_view(), name='documento-planes-pago-gestionar'),

    #Aprobacion de acuerdo de pago
    
    #Juridica
    path('acuerdos-pago/aprobacion/juridica/obtener-solcitiudes-aprobacion/', views.ConsultaSolicitudesAprobacionJuridicaGet.as_view(), name='obtener-solcitiudes-aprobacion-juridica'),
    path('acuerdos-pago/aprobacion/juridica/obtener-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultaPlanesAcuerdosPagoAprobacionJuridica.as_view(), name='obtener-acuerdos-pago-interno-juridica'),
    path('acuerdos-pago/aprobacion/juridica/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoAprobacionJuridica.as_view(), name='detalle-acuerdos-pago-interno-juridica'),
    path('acuerdos-pago/aprobacion/juridica/obtener-informacion-solicitud/<int:id_plan_pago>/', views.GetAcuerdoPagoAprobacionJuridicaView.as_view(), name='obtener-informacion-solicitud-aprobacion-juridica'),
    path('acuerdos-pago/aprobacion/juridica/aprobacion-plan-pago-juridica/<id_plan_pago>/', views.AprobacionAcuerdoJuridicaView.as_view(), name='aprobacion-plan-pago-juridica'),
    path('acuerdos-pago/aprobacion/juridica/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoInternoJuridica.as_view(), name='documento-planes-pago-juridica'),

    #Direccion 
    path('acuerdos-pago/aprobacion/direccion/obtener-solcitiudes-aprobacion/', views.ConsultaSolicitudesAprobacionDireccionGet.as_view(), name='obtener-solcitiudes-aprobacion-direccion'),
    path('acuerdos-pago/aprobacion/direccion/obtener-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultaPlanesAcuerdosPagoAprobacionDireccion.as_view(), name='obtener-acuerdos-pago-interno-direccion'),
    path('acuerdos-pago/aprobacion/direccion/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoAprobacionDireccion.as_view(), name='detalle-acuerdos-pago-interno-direccion'),
    path('acuerdos-pago/aprobacion/direccion/obtener-informacion-solicitud/<int:id_plan_pago>/', views.GetAcuerdoPagoAprobacionDireccionView.as_view(), name='obtener-informacion-solicitud-aprobacion-direccion'),
    path('acuerdos-pago/aprobacion/direccion/aprobacion-plan-pago-direccion/<id_plan_pago>/', views.AprobacionAcuerdoDireccionView.as_view(), name='aprobacion-plan-pago-direccion'),
    path('acuerdos-pago/aprobacion/direccion/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoInternoDireccion.as_view(), name='documento-planes-pago-externo-direccion'),

    #Notificacion de acuerdo de pago
    path('acuerdos-pago/notificacion/obtener-planes-pago-notificacion/', views.ConsultaPlanesNotificacionView.as_view(), name='obtener-solicitudes-notificacion'),
    path('acuerdos-pago/notificacion/notificar-plan-acuerdo/', views.CrearNotificacionPlanAcuerdoView.as_view(), name='notificar-plan-acuerdo'),
    path('acuerdos-pago/notificacion/obtener-informacion-solicitud/<int:id_solicitud_acuerdo_pago>/',views.InfoPlanPagoNotificacionView.as_view(), name='obtener-informacion-solicitud-notificacion'),
    path('acuerdos-pago/notificacion/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoInternoNotificacion.as_view(), name='documento-planes-pago-notificacion'),
    path('acuerdos-pago/notificacion/documento/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDescargableAcuerdoPagoView.as_view(), name='documento-notificacion'),
    
    #Aprobacion recaudador
    path('acuerdos-pago/aprobacion-recaudador/obtener-solcitiudes-aprobacion/', views.ConsultaSolicitudesAprobacionPorRecaudadorGet.as_view(), name='obtener-solcitiudes-aprobacion-recaudador'),
    path('acuerdos-pago/aprobacion-recaudador/obtener-planes-acuerdo-pago/', views.ConsultaPlanesAcuerdosPagoAprobacionRecaudador.as_view(), name='obtener-acuerdos-pago-recaudador'),
    path('acuerdos-pago/aprobacion-recaudador/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoAprobacionRecaudador.as_view(), name='detalle-acuerdos-pago-recaudador'),
    path('acuerdos-pago/aprobacion-recaudador/obtener-informacion-solicitud/<int:id_plan_pago>/', views.GetAcuerdoPagoAprobacionRecaudadorView.as_view(), name='obtener-informacion-solicitud-aprobacion-recaudador'),
    path('acuerdos-pago/aprobacion-recaudador/aprobacion-plan-pago-recaudador/<id_plan_pago>/', views.AprobacionAcuerdoRecaudadorView.as_view(), name='aprobacion-plan-pago-recaudador'),
    path('acuerdos-pago/aprobacion-recaudador/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoAprobacionRecaudador.as_view(), name='documento-planes-pago-aprobacion-recaudador'),

    #Liquidacion de cuotas de acuerdo de pago externo
    path('acuerdos-pago/liquidacion-externo/obtener-solcitiudes/', views.ConsultaSolicitudesLiquidacionExternoGet.as_view(), name='obtener-solcitiudes-aprobacion-liquidacion-externo'),
    path('acuerdos-pago/liquidacion-externo/obtener-planes-acuerdo-pago/', views.ConsultaPlanesAcuerdosPagoLiquidacionExternoGet.as_view(), name='obtener-acuerdos-pago-liquidacion-externo'),
    path('acuerdos-pago/liquidacion-externo/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoLiquidacionExternoGet.as_view(), name='detalle-acuerdos-pago-liquidacion-externo'),
    path('acuerdos-pago/liquidacion-externo/obtener-informacion-solicitud/<int:id_plan_pago>/', views.GetAcuerdoPagoLiquidacionExternoView.as_view(), name='obtener-informacion-solicitud-liquidacion-externo'),
    path('acuerdos-pago/liquidacion-externo/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoLiquidacionExterno.as_view(), name='documento-planes-pago-liquidacion-externo'),

    path('acuerdos-pago/liquidacion-compras-acuerdos-pago-externo/', views.CreateLiquidacionAcuerdoPagoExternoView.as_view(), name='liquidacion-compras-acuerdos-pago-externo'),#externo
    path('acuerdos-pago/liquidacion-documento/', views.GetLiquidacionDocumentoAcuerdoPagoExternoView.as_view(), name='liquidacion-documento-acuerdos-pago-externo'),#externo

    #Pago de cuotas de acuerdo de pago externo PSE
    path('acuerdos-pago/externo-pago/obtener-solictudes-acuerdo-pago/', views.ConsultaSolicitudesConCuotasLiquidadasExternoGet.as_view(), name='pago-cuotas-acuerdo-pago-externo'),
    path('acuerdos-pago/externo-pago/obtener-planes-acuerdo-pago/', views.ConsultaPlanesAcuerdosPagoPSEExternoGet.as_view(), name='obtener-acuerdos-pago-pse-externo'),
    path('acuerdos-pago/externo-pago/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoPSEExternoGet.as_view(), name='detalle-acuerdos-pago-pse-externo'),
    path('acuerdos-pago/externo-pago/info-recaudador-cuota-pse/', views.InfoRecaudadorCuotaPlanPagoPSEView.as_view(), name='info-recaudador-cuota-pse-externo'),
    path('acuerdos-pago/externo-pago/cuotas-pagadas/', views.CuotasPagadasPorPlanPagoView.as_view(), name='cuotas-pagadas-por-plan'),

    #Liquidacion de cuotas de acuerdo de pago Interno
    path('acuerdos-pago/liquidacion-interno/obtener-solcitiudes/', views.ConsultaSolicitudesLiquidacionInternoView.as_view(), name='obtener-solcitiudes-aprobacion-liquidacion-interno'),
    path('acuerdos-pago/liquidacion-interno/obtener-planes-acuerdo-pago/', views.ConsultaPlanesAcuerdosPagoLiquidacionInternoView.as_view(), name='obtener-acuerdos-pago-liquidacion-interno'),
    path('acuerdos-pago/liquidacion-interno/detalles-planes-acuerdo-pago/<int:id_solicitud_acuerdo_pago>/', views.ConsultadDetallesPlanesPagoLiquidacionInternoView.as_view(), name='detalle-acuerdos-pago-liquidacion-interno'),
    path('acuerdos-pago/liquidacion-interno/obtener-informacion-solicitud/<int:id_plan_pago>/', views.GetAcuerdoPagoLiquidacionInternoView.as_view(), name='obtener-informacion-solicitud-liquidacion-interno'),
    path('acuerdos-pago/liquidacion-interno/documento-planes-pago/<int:id_solicitud_acuerdo_pago>/',views.DocumentoDetallesPlanesPagoLiquidacionInterno.as_view(), name='documento-planes-pago-liquidacion-interno'),

    path('acuerdos-pago/liquidacion-compras-interno/', views.CreateLiquidacionAcuerdoPagoInternoView.as_view(), name='liquidacion-compras-acuerdos-pago-interno'),#interno
    path('acuerdos-pago/liquidacion-documento-interno/', views.GetLiquidacionDocumentoAcuerdoPagoInternoView.as_view(), name='liquidacion-documento-acuerdos-pago-interno'),#interno
   
    #Consultar cuotas pagadas interno
    path('acuerdos-pago/interno/consultar-cuotas-pagadas/', views.ConsultarCuotasPagadasInternoView.as_view(), name='consultar-cuotas-pagadas-interno'),

    #Consultar cuotas pagadas externo
    path('acuerdos-pago/externo/consultar-cuotas-pagadas/', views.ConsultarCuotasPagadasExternoView.as_view(), name='consultar-cuotas-pagadas-externo'),

    #Pagos por PSE
    path('pagos/webhook/', views_pagos.PagosWebhookView.as_view(), name='pagos-webhook'), 
    path('pagos/obtener-pagos/', views_pagos.PagosListView.as_view(), name='obtener-pagos'),
    path('pagos/generar-documento/', views_pagos.DocumentoPagoView.as_view(), name='generar-documento-pago'),
    path('pagos/marcar-facturas-pagadas-rango/', views_pagos.MarcarFacturasPagadasPorRangoView.as_view(), name='marcar-facturas-pagadas-rango'),
    path('pagos/iniciar-pago/', views_pagos.IniciarPagoRESTView.as_view(), name='iniciar-pago'),
    path('pagos/ver-pago/', views_pagos.PagoVerificadoView.as_view(), name='ver-pago'),
    
    # Incluir URLs de ZonaPagos
    path('pagos/', include('recaudos.urls.pagos_zonapagos_urls')),

    # Incluir URLs de Siesa
    path('', include('recaudos.urls.siesa_urls')),

    # Generación y descarga: Factura Única Nacional (POST con N facturas, GET con 10 consecutivas)
    path('factura-unica/zip/<int:nro_factura>/', views.GenerarFacturaUnicaNacionalZipView.as_view(), name='factura-unica-zip'),  # compat GET secuencial
    path('factura-unica/zip/', views.GenerarFacturaUnicaNacionalZipView.as_view(), name='factura-unica-zip-post'),  # POST con N números

    # Registro de no compras
    path('registro-no-compras/get/<int:pk>/', views_facturas.ComprasNoEfectuadasByIdViews.as_view(), name='registro-no-compras-get'),
    path('registro-no-compras/create/', views_facturas.ComprasNoEfectuadasViews.as_view(), name='registro-no-compras-create'),
    path('registro-no-compras/update/<int:pk>/', views_facturas.ComprasNoEfectuadasViews.as_view(), name='registro-no-compras-update'),
    path('registro-no-compras/list/', views_facturas.ComprasNoEfectuadasViews.as_view(), name='registro-no-compras-list'),

    

]