from django.urls import path

from recaudos.views import documentos_views as views
from reportes.views import excel_plantilla_view as excel_views

urlpatterns = [
    #Configuracion Consecutivo
    path('configuracion_consecutivo/', views.ConfiguracionConsecutivoView.as_view(), name='configuracion-y-obtener-consecutivo'),
    path('configuracion_consecutivo/<str:pk>/', views.ConfiguracionConsecutivoView.as_view(), name='actualiza-y-eliminar-configuracion-consecutivo'),

    path('plantilla_documento/', views.PlantillasDocView.as_view(),name='crear-plantilla'),
    path('plantilla_documento/<str:pk>/', views.PlantillasDocView.as_view(),name='eliminar-plantilla'),
    #path('plantilla_documento/update/<str:pk>/', views.PlantillasDocUpdateUpdate.as_view(),name='actualizar-plantilla'),
    path('plantilla_documento/get/busqueda_avanzada/', views.BusquedaAvanzadaPlantillas.as_view(),name='busqueda-plantilla'),
    path('plantilla_documento/get_id/<str:pk>/', views.PlantillasDocGetById.as_view(),name='listar-detalle-plantilla'),
    path('plantilla_documento/get_detalle_id/<str:pk>/', views.PlantillasDocGetDetalleById.as_view(),name='listar-detalle-plantilla'),
    #
    path('plantilla_documento/get/busqueda_avanzada_admin/', views.BusquedaAvanzadaPlantillasAdmin.as_view(),name='busqueda-plantilla-admin'),
    path('plantillas_documentos/get/', views.PlantillasDocGet.as_view(),name='plantillas-documentos'),

    path('generador_documentos/', views.GeneradorDocumentosView.as_view(),name='crear-documento'),

    path('asignacion_documentos/', views.AsignacionDocsView.as_view(),name='asignacion-documento'),
    path('asignacion_documentos/<str:pk>/', views.AsignacionDocsView.as_view(),name='eliminar-asignacion-documento'),

    path('convert_word_to_pdf/', views.ConvertWordToPdfView.as_view(),name='convert-word-to-pdf'),

    path('aceptar_rechazar_asignacion/', views.AceptarRechazarAsignacionView.as_view(),name='aceptar-rechazar-asignacion'),
    
    # Plantillas Excel
    path('excel_plantilla/', excel_views.ExcelPlantillaView.as_view(), name='generar-documento-excel'),
    path('plantillas_excel/', excel_views.PlantillasExcelView.as_view(), name='listar-plantillas-excel'),
    path('analizar_plantilla_excel/', excel_views.AnalizarPlantillaExcelView.as_view(), name='analizar-plantilla-excel'),
]
