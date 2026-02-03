from django.urls import path

from reportes.views import reportes_views as views
from reportes.views import reporte1_view as views1
from reportes.views import reporte2_view as views2
from reportes.views import reporte5_view as views5
from reportes.views import reporte6_view as views6
from reportes.views import reporte7_view as views7
from reportes.views import reporte10_view as views10
from reportes.views import tablero1_view as tviews1
from reportes.views import tablero2_view as tviews2
from reportes.views import tablero3_view as tviews3
from reportes.views import tablero4_view as tviews4
from reportes.views import tablero5_view as tviews5
from reportes.views import tablero6 as tviews6
from reportes.views import tablero7_view as tviews7
from reportes.views import tablero8 as tviews8

from reportes.views import tablero10 as tviews10
from reportes.views import tablero9 as tviews9
from reportes.views import tablero11 as tviews11
from reportes.views import trm_views as trm_views
from reportes.views import bolsa_ny_views as bolsa_ny_views
from reportes.views import geografia_views as geografia_views
from reportes.views import agregacion_views as agregacion_views
from reportes.views import historico_precio as historico_precio_views
from reportes.views import historico_dept as historico_dept_views
from reportes.views import rendimiento_censo_views
from reportes.views.sleep_view import SleepHelloView

urlpatterns = [
    # Servicio de prueba: sleep y hello
    path('sleep-hello/', SleepHelloView.as_view(), name='sleep-hello'),

    #Reporte 1.1: Libro de compra 
    path('reporte-libro-compras/', views1.FacturasPorRecaudadorView.as_view(), name='reporte-facturas-por-recaudador'),
    path('documento-reporte-libro-compras/', views1.DescargarLibroCompraRecaudadorView.as_view(), name='documento-reporte-libro-compras'),

    #Reporte 1.2: Libro de compra consolidado 
    path('reporte-consolidado-libro-compras-cacao/', views1.ReporteLibroCompraConsolidadoView.as_view(), name='reporte-consolidado-libro-compras-cacao'),
    path('documento-reporte-consolidado-libro-compras-cacao/', views1.DescargarReporteLibroCompraConsolidadoView.as_view(), name='documento-reporte-consolidado-libro-compras-cacao'),

    #Reporte 2: REPORTE CONSOLIDADO PAGO CUOTA DE FOMENTO
    path('reporte-consolidado-pago-cuota-fomento/', views2.ReporteConsolidadoPagoCuotaFomentoView.as_view(), name='reporte-consolidado-pago-cuota-fomento'),
    path('documento-reporte-consolidado-pago-cuota-fomento/', views2.DescargarReporteConsolidadoPagoCuotaFomentoView.as_view(), name='documento-reporte-libro-compras'),

    #Reporte 3: REPORTE CONSOLIDADO DE PAGO DE CUOTA DE FOMENTO
    path('recaudo-cuota-fomento-regular/', views.RecaudoCuotaFomentoRegularView.as_view(), name='recaudo-cuota-fomento-regular'),
    path('recaudo-por-acuerdos-pago/', views.RecaudoPorAcuerdosPagoView.as_view(), name='recaudo-por-acuerdos-pago'),
    path('recaudo-por-intereses-acuerdo-pago/', views.RecaudoPorInteresesAcuerdoPagoView.as_view(), name='recaudo-por-intereses-acuerdo-pago'),
    path('documento-recaudo-cuota-fomento-regular/', views.DescargarRecaudoCuotaFomentoRegularView.as_view(), name='documento-recaudo-cuota-fomento-regular'),
    path('documento-recaudo-por-acuerdos-pago/', views.DescargarRecaudoPorAcuerdosPagoView.as_view(), name='documento-recaudo-por-acuerdos-pago'),
    path('documento-recaudo-por-intereses-acuerdo-pago/', views.DescargarRecaudoPorInteresesAcuerdoPagoView.as_view(), name='documento-recaudo-por-intereses-acuerdo-pago'),
    
    #Reporte 5: Cargues SICEX
    path('reporte-sicex/', views5.ReporteSicexView.as_view(), name='reporte-sicex'),
    path('documento-reporte-sicex/', views5.DescargarReporteSicexView.as_view(), name='documento-reporte-sicex'),

    #Reporte 6: Pagos en linea
    path('reporte-pagos-en-linea/', views6.ReportePagosEnLineaView.as_view(), name='reporte-pagos-en-linea'),
    path('documento-reporte-pagos-en-linea/', views6.DescargarReportePagosEnLineaView.as_view(), name='documento-reporte-pagos-en-linea'),
    
    #Reporte 7: Precio nacional del cacao
    path('reporte-precio-nacional-cacao/', views7.PrecioNacionalCacaoView.as_view(), name='reporte-precio-nacional-cacao'),
    path('documento-reporte-precio-nacional-cacao/', views7.GenerarDocumentoPrecioNacionalCacaoView.as_view(), name='documento-reporte-precio-nacional-cacao'),

    #Reporte 9: REPORTE CONSOLIDADO DE ACUERDOS DE PAGO
    path('reporte-consolidado-acuerdos-pago/', views.ReporteConsolidadoAcuerdosPagoView.as_view(), name='reporte-consolidado-acuerdos-pago'),
    path('sumatorias-reporte-consolidado-acuerdos-pago/', views.SumatoriasReporteAcuerdosPagoView.as_view(), name='sumatorias-reporte-consolidado-acuerdos-pago'),
    path('documento-reporte-consolidado-acuerdos-pago/', views.DescargarReporteConsolidadoAcuerdosPagoView.as_view(), name='documento-reporte-consolidado-acuerdos-pago'),

    #Reporte 10: CONSOLIDADO PRODUCCION NACIONAL DE CACAO
    path('reporte-consolidado-produccion-nacional-cacao/', views10.ConsolidadoProduccionNacionalCacaoView.as_view(), name='reporte-consolidado-produccion-nacional-cacao'),
    path('documento-reporte-consolidado-produccion-nacional-cacao/', views10.GenerarDocumentoConsolidadoProduccionNacionalCacaoView.as_view(), name='documento-reporte-consolidado-produccion-nacional-cacao'),

    # Tablero de control 
    path('select/aduanas-embarque/', tviews1.AduanaEmbarqueview.as_view(), name='aduanas-embarque'),
    path('select/posiciones/', tviews1.Posicionview.as_view(), name='posiciones'),
    path('select/continentes/', tviews1.ContinenteView.as_view(), name='continentes'),
    path('select/vias/', tviews1.ViaView.as_view(), name='vias'),
    path('tablero-control-sicex/', tviews1.TableroControlSicex.as_view(), name='tablero-control-sicex'),
    path('tablero-control-sicex-mes/', tviews2.TableroControlSicexMes.as_view(), name='tablero-control-sicex-mes'),
    path('tablero-control-sicex-pos/', tviews3.TableroControlSicexPos.as_view(), name='tablero-control-sicex-pos'),
    path('tablero-control-estimados/', tviews4.TableroControlEstimados.as_view(), name='tablero-control-estimados'),
    path('tablero-control-promedio/', tviews5.TableroControlPromedio.as_view(), name='tablero-control-promedio'),
    path('tablero-control-compras-cacao-tabla/', tviews7.TableroControlComprasCacaoTabla.as_view(), name='tablero-control-compras-cacao-tabla'),
    path('tablero-control-compras-cacao/', tviews7.TableroControlComprasCacao.as_view(), name='tablero-control-compras-cacao'),
    
    # Tablero 8: Comparativo de Períodos
    path('tablero8/', tviews8.Tablero8View.as_view(), name='tablero8'),
    path('tablero8/filtros/', tviews8.Tablero8FiltrosView.as_view(), name='tablero8-filtros'),
    
    # Tablero 10: Acuerdos de Pago
    path('select/tipos-documento/', tviews10.TiposDocumentoView.as_view(), name='tipos-documento'),
    path('tablero-acuerdos-pago/', tviews10.TableroAcuerdosPago.as_view(), name='tablero-acuerdos-pago'),
    path('tablero-acuerdos-pago-resumen/', tviews10.TableroAcuerdosPagoResumen.as_view(), name='tablero-acuerdos-pago-resumen'),
    path('tablero-deudores-por-recaudador/', tviews10.TableroDeudoresPorRecaudador.as_view(), name='tablero-deudores-por-recaudador'),
    path('tablero-deudores-por-ubicacion/', tviews10.TableroDeudoresPorUbicacion.as_view(), name='tablero-deudores-por-ubicacion'),
    path('tablero-cartera-por-edad/', tviews10.TableroCarteraPorEdad.as_view(), name='tablero-cartera-por-edad'),

    # Tablero 6: Comparativo Precios Nacionales vs Nueva York
    path('tablero-comparativo-precios-nal-ny/', tviews6.TableroComparativoPreciosNalNy.as_view(), name='tablero-comparativo-precios-nal-ny'),
    path('tablero-precio-promedio/', tviews6.TableroComparativoPreciosNalNy.as_view(), name='tablero-precio-promedio'),

    # Tablero 6: Endpoints de promedios mensuales
    path('tablero6/nal-promedio-mensual/', tviews6.NalPromedioMensualView.as_view(), name='tablero6-nal-promedio-mensual'),
    path('tablero6/trm-promedio-mensual/', tviews6.TrmPromedioMensualView.as_view(), name='tablero6-trm-promedio-mensual'),
    path('tablero6/bolsa-ny-promedio-mensual/', tviews6.BolsaNyPromedioMensualView.as_view(), name='tablero6-bolsa-ny-promedio-mensual'),
    path('tablero6/promedios-mensuales/', tviews6.PromediosMensualesCombinadoView.as_view(), name='tablero6-promedios-mensuales'),
    path('tablero6/promedios-mensuales-comparado/', tviews6.PromediosMensualesComparadoView.as_view(), name='tablero6-promedios-mensuales-comparado'),
    path('tablero6/serie-nal-ny/', tviews6.SerieMensualNalNyView.as_view(), name='tablero6-serie-nal-ny'),

    # TRM (Tasa Representativa del Mercado)
    path('api/trm/', trm_views.TRMViewSet.as_view({'get': 'list', 'post': 'create'}), name='trm-list-create'),
    path('api/trm/<int:pk>/', trm_views.TRMViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='trm-detail'),
    path('api/trm/<int:pk>/update/', trm_views.TRMViewSet.as_view({'put': 'update'}), name='trm-update'),
    path('api/trm/<int:pk>/patch/', trm_views.TRMViewSet.as_view({'patch': 'partial_update'}), name='trm-patch'),
    path('api/trm/validar-datos/', trm_views.TRMViewSet.as_view({'post': 'validar_datos'}), name='trm-validar-datos'),
    path('api/trm/ultimo-precio/', trm_views.TRMViewSet.as_view({'get': 'ultimo_precio'}), name='trm-ultimo-precio'),
    path('api/trm/precio-por-fecha/', trm_views.TRMViewSet.as_view({'get': 'precio_por_fecha'}), name='trm-precio-por-fecha'),
    path('api/trm/resumen-mensual/', trm_views.TRMViewSet.as_view({'get': 'resumen_mensual'}), name='trm-resumen-mensual'),
    path('api/trm/rango-fechas/', trm_views.TRMViewSet.as_view({'get': 'rango_fechas'}), name='trm-rango-fechas'),

    # Bolsa NY (Precios de Cierre de la Bolsa de Nueva York)
    path('api/bolsa-ny/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'list', 'post': 'create'}), name='bolsa-ny-list-create'),
    path('api/bolsa-ny/<int:pk>/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='bolsa-ny-detail'),
    path('api/bolsa-ny/validar-datos/', bolsa_ny_views.BolsaNYViewSet.as_view({'post': 'validar_datos'}), name='bolsa-ny-validar-datos'),
    path('api/bolsa-ny/ultimo-precio/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'ultimo_precio'}), name='bolsa-ny-ultimo-precio'),
    path('api/bolsa-ny/precio-por-fecha/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'precio_por_fecha'}), name='bolsa-ny-precio-por-fecha'),
    path('api/bolsa-ny/resumen-mensual/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'resumen_mensual'}), name='bolsa-ny-resumen-mensual'),
    path('api/bolsa-ny/rango-fechas/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'rango_fechas'}), name='bolsa-ny-rango-fechas'),
    path('api/bolsa-ny/comparativo-trm/', bolsa_ny_views.BolsaNYViewSet.as_view({'get': 'comparativo_trm'}), name='bolsa-ny-comparativo-trm'),

    # Geografía (Departamentos y Municipios)
    path('api/departamentos/', geografia_views.DepartmentViewSet.as_view({'get': 'list'}), name='departamentos-list'),
    path('api/departamentos/<str:pk>/', geografia_views.DepartmentViewSet.as_view({'get': 'retrieve'}), name='departamentos-detail'),
    path('api/departamentos/<str:pk>/municipios/', geografia_views.DepartmentViewSet.as_view({'get': 'municipalities'}), name='departamentos-municipios'),
    
    path('api/municipios/', geografia_views.MunicipalityViewSet.as_view({'get': 'list'}), name='municipios-list'),
    path('api/municipios/<int:pk>/', geografia_views.MunicipalityViewSet.as_view({'get': 'retrieve'}), name='municipios-detail'),
    path('api/municipios/search/', geografia_views.MunicipalityViewSet.as_view({'get': 'search'}), name='municipios-search'),
    path('api/municipios/by-department/', geografia_views.MunicipalityViewSet.as_view({'get': 'by_department'}), name='municipios-by-department'),

    # Servicios de Agregación
    path('api/agregacion/departamentos/', agregacion_views.AgregacionViewSet.as_view({'get': 'departamentos'}), name='agregacion-departamentos'),
    path('api/agregacion/municipios-por-departamento/', agregacion_views.AgregacionViewSet.as_view({'get': 'municipios_por_departamento'}), name='agregacion-municipios-por-departamento'),
    path('api/agregacion/resumen-general/', agregacion_views.AgregacionViewSet.as_view({'get': 'resumen_general'}), name='agregacion-resumen-general'),

    # Tablero 9: Servicios de Agregación Mejorados
    path('api/tablero9/departamentos/', tviews9.DepartamentosAgregacionView.as_view(), name='tablero9-departamentos'),
    path('api/tablero9/municipios-por-departamento/', tviews9.MunicipiosPorDepartamentoView.as_view(), name='tablero9-municipios-por-departamento'),
    path('api/tablero9/resumen-general/', tviews9.ResumenGeneralView.as_view(), name='tablero9-resumen-general'),

    # Producción de Cacao Histórico
    path('api/produccion-cacao/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'list', 'post': 'create'}), name='produccion-cacao-list-create'),
    path('api/produccion-cacao/<int:pk>/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='produccion-cacao-detail'),
    path('api/produccion-cacao/resumen-general/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'resumen_general'}), name='produccion-cacao-resumen-general'),
    path('api/produccion-cacao/por-ano/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'por_ano'}), name='produccion-cacao-por-ano'),
    path('api/produccion-cacao/validar-ano/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'validar_ano'}), name='produccion-cacao-validar-ano'),
    path('api/produccion-cacao/<int:pk>/detalles-mes/', historico_precio_views.ProduccionCacaoHistoricoViewSet.as_view({'get': 'detalles_mes'}), name='produccion-cacao-detalles-mes'),

    # Histórico de Producción por Departamento
    path('api/historico-produccion-departamento/', historico_dept_views.HistoricoProduccionDepartamentoView.as_view(), name='historico-produccion-departamento'),
    path('api/resumen-produccion-departamento/', historico_dept_views.ResumenProduccionDepartamentoView.as_view(), name='resumen-produccion-departamento'),
    path('api/top-departamentos-produccion/', historico_dept_views.TopDepartamentosProduccionView.as_view(), name='top-departamentos-produccion'),
    # Registro de Producción por Departamento (upsert)
    path('api/registrar-produccion-departamento/', historico_dept_views.RegistrarProduccionDepartamentoView.as_view(), name='registrar-produccion-departamento'),
    # Editar Producción por Departamento por ID
    path('api/registrar-produccion-departamento/<int:pk>/', historico_dept_views.RegistrarProduccionDepartamentoView.as_view(), name='editar-produccion-departamento'),

    # Tablero 11: Producción por Departamentos con Áreas y Rendimientos
    path('api/tablero11/produccion-departamentos/', tviews11.Tablero11ProduccionDepartamentosView.as_view(), name='tablero11-produccion-departamentos'),
    path('api/tablero11/produccion-departamentos-censo/', tviews11.Tablero11ProduccionDepartamentosConCensoView.as_view(), name='tablero11-produccion-departamentos-censo'),
    path('api/tablero11/produccion-departamentos-ejemplo/', tviews11.Tablero11ProduccionDepartamentosRealView.as_view(), name='tablero11-produccion-departamentos-ejemplo'),
    path('api/tablero11/series-anuales/', tviews11.Tablero11SeriesAnualesView.as_view(), name='tablero11-series-anuales'),
    path('api/tablero11/pronostico-lineal/', tviews11.Tablero11PronosticoLinealView.as_view(), name='tablero11-pronostico-lineal'),
    path('api/tablero11/distribucion-mensual/', tviews11.Tablero11DistribucionMensualView.as_view(), name='tablero11-distribucion-mensual'),
    path('api/tablero11/produccion-historica/', tviews11.Tablero11ProduccionHistoricaView.as_view(), name='tablero11-produccion-historica'),
    path('api/tablero11/escenario-pronostico-lineal/', tviews11.Tablero11EscenarioPronosticoLinealView.as_view(), name='tablero11-escenario-pronostico-lineal'),

    # CRUD Rendimiento Censo por Departamento
    path('api/rendimiento-censo/', rendimiento_censo_views.RendimientoCensoDepartamentoListCreateView.as_view(), name='rendimiento-censo-list-create'),
    path('api/rendimiento-censo/<str:cod_departamento>/', rendimiento_censo_views.RendimientoCensoDepartamentoRetrieveUpdateDestroyView.as_view(), name='rendimiento-censo-detail'),
    path('api/rendimiento-censo/bulk-update/', rendimiento_censo_views.RendimientoCensoDepartamentoBulkUpdateView.as_view(), name='rendimiento-censo-bulk-update'),

] 
