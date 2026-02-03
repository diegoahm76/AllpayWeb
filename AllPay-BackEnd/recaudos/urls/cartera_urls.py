from django.urls import path
from recaudos.views import cartera_view as views


urlpatterns = [

    # Fechas vigentes
    path('fechas-vigentes/<str:cod>/', views.FechasVigenciaDetailView.as_view(), name='fechas-vigentes'),
    path('fechas-vigentes-list/', views.FechasVigenciaView.as_view(), name='fechas-vigentes-list'),
    path('fechas-vigentes-create/', views.FechasVigenciaView.as_view(), name='fechas-vigentes-create'),
    path('fechas-vigentes-update/<str:cod>/', views.FechasVigenciaView.as_view(), name='fechas-vigentes-update'),

    # SICEX
    path('sicex-cargue/validate/', views.CargueMasivoSicexValidate.as_view(), name='sicex-validate'),
    path('sicex-cargue/create/', views.CargueMasivoSicexView.as_view(), name='sicex-create'),
    path('sicex-cargue/resumen/', views.SicexResumenView.as_view(), name='sicex-resumen'),
    path('sicex-cargue/resumen/<int:consecutivo>/archivo/', views.SicexCargueDownloadView.as_view()),
    path('sicex-cargue/list/<int:consecutivo>/', views.SicexListView.as_view(), name='sicex-list'),
    path('sicex-cargue/delete/<int:consecutivo>/', views.SicexDeleteView.as_view(), name='sicex-delete'),
    path('sicex-cargue/update/<int:consecutivo>/', views.UpdateCargueMasivoSicexView.as_view(), name='sicex-update'),

    # Cartera
    path('cartera-consulta-interno/', views.CarteraInternoView.as_view(), name='cartera-consulta-interno'),
    path('cartera-consulta-externo/', views.CarteraExternoView.as_view(), name='cartera-consulta-externo'),
    path('cartera-consulta-totales/', views.CarteraTotalesView.as_view(), name='cartera-consulta-totales'),
    path('cartera-consulta-download/<int:factura_id>/<int:user_id>/', views.CarteraDownloadView.as_view(), name='cartera-consulta-download'),

    # Puertos de exportación
    path('puertos-exportacion/detalle/<int:pk>/', views.PuertosExportacionDetailView.as_view(), name='puertos-exportacion-detail'),
    path('puertos-exportacion/', views.PuertosExportacionView.as_view(), name='puertos-exportacion'),
    path('puertos-exportacion/create/', views.PuertosExportacionView.as_view(), name='puertos-exportacion-create'),
    path('puertos-exportacion/update/<int:pk>/', views.PuertosExportacionView.as_view(), name='puertos-exportacion-update'),
    path('puertos-exportacion/delete/<int:pk>/', views.PuertosExportacionView.as_view(), name='puertos-exportacion-delete'),

    # Acciones de Cobro Persuasivo
    path('acciones-cobro-persuasivo/', views.AccionesCobroPersuasivoView.as_view(), name='acciones-cobro-persuasivo-list'),
    path('acciones-cobro-persuasivo/create/', views.AccionesCobroPersuasivoView.as_view(), name='acciones-cobro-persuasivo-create'),
    path('acciones-cobro-persuasivo/detalle/<int:pk>/', views.AccionesCobroPersuasivoDetailView.as_view(), name='acciones-cobro-persuasivo-detail'),
    path('acciones-cobro-persuasivo/update/<int:pk>/', views.AccionesCobroPersuasivoView.as_view(), name='acciones-cobro-persuasivo-update'),
    path('acciones-cobro-persuasivo/delete/<int:pk>/', views.AccionesCobroPersuasivoView.as_view(), name='acciones-cobro-persuasivo-delete'),
    path('acciones-cobro-persuasivo/simple/', views.AccionesCobroPersuasivoSimpleView.as_view(), name='acciones-cobro-persuasivo-simple'),

    # Paz y Salvo
    path('consecutivo-paz-salvo/', views.ConsecutivoPazySalvoView.as_view(), name='consecutivo-paz-salvo'),
    path('paz-salvo-datos-recaudador/', views.DatosRecaudadorView.as_view(), name='paz-salvo-datos-recaudador'),
    path('liquidaciones-pagadas/', views.LiquidacionesPagadasView.as_view(), name='liquidaciones-pagadas'),
    path('facturas-pagadas/', views.FacturasPagadasView.as_view(), name='facturas-pagadas'),
    path('facturas-pagadas-seleccionadas/', views.FacturasPagadasSeleccionadasView.as_view(), name='facturas-pagadas-seleccionadas'),
    path('paz-salvo-visualizar/', views.PazYSalvoGenerarDocumentoView.as_view(), name='paz-salvo-visualizar'),
    path('paz-salvo-crear/', views.PazySalvoCreateView.as_view(), name='paz-salvo-generar'),
    path('paz-salvo-verificar/<str:consepaz>/', views.PazySalvoVerificarView.as_view(), name='paz-salvo-verificar'),
    path('paz-salvo-lista/', views.PazySalvoGetView.as_view(), name='paz-salvo-lista'),
    path('paz-salvo-detalle/<int:pk>/', views.PazySalvoDetailView.as_view(), name='paz-salvo-detalle'),
    path('paz-salvo-update/<int:pk>/', views.PazySalvoUpdateView.as_view(), name='paz-salvo-update'),
    path('paz-salvo-lista-interno/', views.PazySalvoInternoView.as_view(), name='paz-salvo-lista-interno'),
    path('paz-salvo-aprobar/<int:pk>/', views.PazySalvoAprobarView.as_view(), name='paz-salvo-aprobar'),

    # Cobros Persuasivos
    path('cobros-persuasivos/', views.CobroPersuasivoView.as_view(), name='cobros-persuasivos-list'),
    path('cobros-persuasivos/create/', views.CobroPersuasivoView.as_view(), name='cobros-persuasivos-create'),
    path('cobros-persuasivos/detalle/<int:pk>/', views.CobroPersuasivoDetailView.as_view(), name='cobros-persuasivos-detail'),
    path('cobros-persuasivos/<int:pk>/update/', views.CobroPersuasivoDetailView.as_view(), name='cobros-persuasivos-update'),
    path('cobros-persuasivos/<int:pk>/delete/', views.CobroPersuasivoDetailView.as_view(), name='cobros-persuasivos-delete'),

    # Facturas y Cobros Persuasivos
    path('cobros-persuasivos/<int:factura_id>/', views.FacturaCobroPersuasivoView.as_view(), name='factura-cobros-persuasivos'),

    # Persuasivo Facturas (relaciones)
    path('persuasivo-facturas/', views.PersuasivoFacturasView.as_view(), name='persuasivo-facturas-list'),
    path('persuasivo-facturas/create/', views.PersuasivoFacturasView.as_view(), name='persuasivo-facturas-create'),
    path('persuasivo-facturas/cobro/<int:cobro_id>/', views.PersuasivoFacturasView.as_view(), name='persuasivo-facturas-by-cobro'),
    path('persuasivo-facturas/<int:pk>/delete/', views.PersuasivoFacturasView.as_view(), name='persuasivo-facturas-delete'),

    # ================== URLs PARA COBRO COACTIVO ==================
    
    # Cobros Coactivos
    path('cobros-coactivos/', views.CobroCoactivoView.as_view(), name='cobros-coactivos-list'),
    path('cobros-coactivos/create/', views.CobroCoactivoView.as_view(), name='cobros-coactivos-create'),
    path('cobros-coactivos/detalle/<int:pk>/', views.CobroCoactivoDetailView.as_view(), name='cobros-coactivos-detail'),
    path('cobros-coactivos/<int:pk>/update/', views.CobroCoactivoDetailView.as_view(), name='cobros-coactivos-update'),
    path('cobros-coactivos/<int:pk>/delete/', views.CobroCoactivoDetailView.as_view(), name='cobros-coactivos-delete'),

    # Facturas y Cobros Coactivos
    path('cobros-coactivos/<int:factura_id>/', views.FacturaCobroCoactivoView.as_view(), name='factura-cobros-coactivos'),

    # Coactivo Facturas (relaciones)
    path('coactivo-facturas/', views.CoactivoFacturasView.as_view(), name='coactivo-facturas-list'),
    path('coactivo-facturas/create/', views.CoactivoFacturasView.as_view(), name='coactivo-facturas-create'),
    path('coactivo-facturas/cobro/<int:cobro_coactivo_id>/', views.CoactivoFacturasView.as_view(), name='coactivo-facturas-by-cobro'),
    path('coactivo-facturas/<int:pk>/delete/', views.CoactivoFacturasView.as_view(), name='coactivo-facturas-delete'),

    # Conversión de cobros persuasivos a coactivos
    path('convertir-persuasivo-a-coactivo/', views.ConvertirPersuasivoACoactivoView.as_view(), name='convertir-persuasivo-coactivo'),
    
    # ================== GESTIÓN AVANZADA DE COBRO COACTIVO ==================
    path('cartera-consulta-coactivo/', views.CarteraCoactivoView.as_view(), name='cartera-consulta-coactivo'),
    path('acciones-cobro-coactivo/simple/', views.AccionesCobroCoactivoSimpleView.as_view(), name='acciones-cobro-coactivo-simple'),
    path('acciones-cobro-coactivo/', views.AccionesCobroCoactivoView.as_view(), name='acciones-cobro-coactivo'),
    path('acciones-cobro-coactivo/<int:pk>/', views.AccionesCobroCoactivoView.as_view(), name='acciones-cobro-coactivo-detail'),
    path('convertir-multiple-persuasivo-coactivo/', views.ConvertirMultiplePersuasivoACoactivoView.as_view(), name='convertir-multiple-persuasivo-coactivo'),

    # ================== ELIMINACIÓN MASIVA ==================
    
    # Eliminación masiva de facturas por rango
    path('eliminacion-masiva-facturas/', views.EliminacionMasivaFacturasView.as_view(), name='eliminacion-masiva-facturas'),
    path('eliminacion-masiva-facturas/preview/', views.EliminacionMasivaFacturasView.as_view(), name='eliminacion-masiva-preview'),

]