from django.urls import path
from recaudos.views.siesa_views import (
    SiesaListView,
    SiesaCreateView,
    SiesaDetailView,
    SiesaUpdateView,
    SiesaBulkCreateView,
    SiesaOptionsView,
    SiesaCompaniaDefaultView,
    SiesaComprobanteView
)

urlpatterns = [
    # CRUD básico separado
    path('siesa/', SiesaListView.as_view(), name='siesa-list'),
    path('siesa/create/', SiesaCreateView.as_view(), name='siesa-create'),
    path('siesa/<int:id>/', SiesaDetailView.as_view(), name='siesa-detail'),
    path('siesa/<int:id>/update/', SiesaUpdateView.as_view(), name='siesa-update'),
    
    # Operaciones masivas
    path('siesa/bulk-create/', SiesaBulkCreateView.as_view(), name='siesa-bulk-create'),
    
    # Opciones y configuración
    path('siesa/options/', SiesaOptionsView.as_view(), name='siesa-options'),
    path('siesa/compania-default/', SiesaCompaniaDefaultView.as_view(), name='siesa-compania-default'),
    path('siesa/comprobante/', SiesaComprobanteView.as_view(), name='siesa-comprobante'),
]
