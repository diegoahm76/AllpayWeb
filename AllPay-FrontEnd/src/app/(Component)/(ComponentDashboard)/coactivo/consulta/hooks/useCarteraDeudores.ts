import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  getCarteraDeudores, 
  type CarteraDeudorAPI, 
  type CarteraDeudoresBusquedaParams 
} from '../adapters/carteraDeudores.adapter';

// Interfaces
export interface CarteraDeudor {
  id: number;
  documento_recaudador: string;
  nombre_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: string;
  factura_proveedor: string;
  nit_proveedor: string;
  municipio_procedencia_cacao: string;
  departamento_procedencia_cacao: string;
  kilos: number;
  precio_kilo: number;
  valor_bruto: number;
  dias_mora: number;
  nro_acuerdo_pago: string;
  valor_interes: number;
  estado_acuerdo_pago: string;
}

export interface FormDataCartera {
  fechaInicio: string;
  fechaFinalizacion: string;
}

export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
}

// Función para transformar datos de API a estructura interna
const transformApiDataToCarteraDeudor = (apiData: CarteraDeudorAPI): CarteraDeudor => {
  // Función auxiliar para determinar el estado de acuerdo de pago
  const getEstadoAcuerdoPago = (factura: CarteraDeudorAPI): string => {
    if (factura.tiene_solicitud_acuerdo_pago) return 'SOLICITADO';
    if (factura.dias_mora > 60) return 'EN MORA CRÍTICA';
    if (factura.dias_mora > 30) return 'EN MORA';
    if (factura.dias_mora > 0) return 'VENCIDA';
    return 'AL DÍA';
  };

  // Función auxiliar para generar número de acuerdo de pago
  const getNumeroAcuerdoPago = (factura: CarteraDeudorAPI): string => {
    if (factura.tiene_solicitud_acuerdo_pago) {
      return `AP-${factura.id_factura_unica}`;
    }
    return 'SIN ACUERDO';
  };

  // Función auxiliar para obtener nombre del recaudador (placeholder para futura implementación)
  const getNombreRecaudador = (numeroDocumento: string): string => {
    // TODO: Implementar búsqueda de nombre de recaudador por documento
    // Por ahora retornamos un formato genérico
    return `RECAUDADOR ${numeroDocumento}`;
  };

  return {
    id: apiData.id_factura_unica,
    documento_recaudador: apiData.numero_documento_recaudador || 'N/A',
    nombre_recaudador: apiData.recaudador_nombre || getNombreRecaudador(apiData.numero_documento_recaudador),
    fecha_compra: apiData.fecha_compra || '',
    nro_factura_unica: apiData.nro_factura_unica?.toString() || 'N/A',
    factura_proveedor: `FP-${apiData.numero_documento_proveedor || 'N/A'}`,
    nit_proveedor: apiData.numero_documento_proveedor || 'N/A',
    municipio_procedencia_cacao: apiData.nombre_municipio_cacao || apiData.municipio || 'N/A',
    departamento_procedencia_cacao: apiData.nombre_departamento_cacao || apiData.departamento || 'N/A',
    kilos: apiData.total_kilos || 0,
    precio_kilo: apiData.promedio_valor_kilo || 0,
    valor_bruto: apiData.valor_bruto || 0,
    dias_mora: apiData.dias_mora || 0,
    nro_acuerdo_pago: getNumeroAcuerdoPago(apiData),
    valor_interes: apiData.intereses || 0,
    estado_acuerdo_pago: getEstadoAcuerdoPago(apiData)
  };
};

// Hook personalizado para manejar la cartera de deudores
export const useCarteraDeudores = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [formData, setFormData] = useState<FormDataCartera>({
    fechaInicio: '',
    fechaFinalizacion: ''
  });
  
  const [carteraDeudores, setCarteraDeudores] = useState<CarteraDeudor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [foundCollectorDocument, setFoundCollectorDocument] = useState('');
  
  // Estados para alertas
  const [alertState, setAlertState] = useState<AlertState>({
    showAlertNotification: false,
    alertMessage: '',
    showErrorAlert: false,
    errorAlertMessage: ''
  });
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados para selección múltiple
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Funciones para manejo de formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Función para manejar recaudador encontrado
  const handleFoundCollector = useCallback((documentoIdentificacion: string) => {
    setFoundCollectorDocument(documentoIdentificacion);
  }, []);

  // Función de búsqueda - ACTUALIZADA PARA USAR API REAL
  const handleSearch = useCallback(async () => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Token de autenticación no disponible'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar parámetros de búsqueda
      const searchParams: CarteraDeudoresBusquedaParams = {
        page: currentPage,
        page_size: 10
      };

      // Agregar filtros de fecha si están definidos
      if (formData.fechaInicio) {
        searchParams.fecha_desde = formData.fechaInicio;
      }
      
      if (formData.fechaFinalizacion) {
        searchParams.fecha_hasta = formData.fechaFinalizacion;
      }
      
      // Agregar filtro por documento de recaudador si está definido
      if (foundCollectorDocument) {
        searchParams.numero_documento_recaudador = foundCollectorDocument;
      }

      // Llamar a la API
      const response = await getCarteraDeudores(token, searchParams);
      
      if (response.success && response.data.success) {
        // Transformar datos de API a estructura interna
        const carteraTransformada = response.data.facturas.map(transformApiDataToCarteraDeudor);
        
        setCarteraDeudores(carteraTransformada);
        setTotalPages(response.total_pages);
        
        setAlertState({
          showAlertNotification: true,
          alertMessage: `Búsqueda completada exitosamente. ${carteraTransformada.length} registros encontrados.`,
          showErrorAlert: false,
          errorAlertMessage: ''
        });
        
        // Ocultar alerta después de 3 segundos
        setTimeout(() => {
          setAlertState(prev => ({
            ...prev,
            showAlertNotification: false
          }));
        }, 3000);
        
      } else {
        throw new Error('Respuesta no exitosa de la API');
      }
      
    } catch (error) {
      console.error('[useCarteraDeudores] - Error en búsqueda:', error);
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error instanceof Error ? error.message : 'Error al realizar la búsqueda. Intente nuevamente.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, foundCollectorDocument, currentPage, token]);

  // Función para limpiar búsqueda
  const handleClearSearch = useCallback(() => {
    setFormData({
      fechaInicio: '',
      fechaFinalizacion: ''
    });
    setFoundCollectorDocument('');
    setCarteraDeudores([]);
    setCurrentPage(1);
    setTotalPages(1);
    setSelectedRows(new Set());
    setSelectAll(false);
    
    setAlertState({
      showAlertNotification: false,
      alertMessage: '',
      showErrorAlert: false,
      errorAlertMessage: ''
    });
  }, []);

  // Función para manejo de selección de filas
  const handleRowSelect = useCallback((id: number) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      
      // Actualizar estado de seleccionar todo
      setSelectAll(newSelection.size === carteraDeudores.length && carteraDeudores.length > 0);
      
      return newSelection;
    });
  }, [carteraDeudores.length]);

  // Función para seleccionar/deseleccionar todo
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(carteraDeudores.map(item => item.id));
      setSelectedRows(allIds);
      setSelectAll(true);
    }
  }, [selectAll, carteraDeudores]);

  // Función para cambio de página - ACTUALIZADA PARA RECARGAR DATOS
  const handlePageChange = useCallback(async (page: number) => {
    setCurrentPage(page);
    
    if (!token) return;
    
    setIsLoading(true);
    
    try {
      // Preparar parámetros con la nueva página
      const searchParams: CarteraDeudoresBusquedaParams = {
        page,
        page_size: 10
      };

      if (formData.fechaInicio) searchParams.fecha_desde = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_hasta = formData.fechaFinalizacion;
      if (foundCollectorDocument) searchParams.numero_documento_recaudador = foundCollectorDocument;

      const response = await getCarteraDeudores(token, searchParams);
      
      if (response.success && response.data.success) {
        const carteraTransformada = response.data.facturas.map(transformApiDataToCarteraDeudor);
        setCarteraDeudores(carteraTransformada);
      }
      
    } catch (error) {
      console.error('[useCarteraDeudores] - Error al cambiar página:', error);
    } finally {
      setIsLoading(false);
    }
  }, [formData, foundCollectorDocument, token]);

  // Función para obtener todos los datos para Excel - ACTUALIZADA PARA API
  const fetchAllDataForExcel = useCallback(async (page: number) => {
    if (!token) {
      return { data: [], total_pages: 1 };
    }
    
    try {
      const searchParams: CarteraDeudoresBusquedaParams = {
        page,
        page_size: 100 // Más registros para Excel
      };

      if (formData.fechaInicio) searchParams.fecha_desde = formData.fechaInicio;
      if (formData.fechaFinalizacion) searchParams.fecha_hasta = formData.fechaFinalizacion;
      if (foundCollectorDocument) searchParams.numero_documento_recaudador = foundCollectorDocument;

      const response = await getCarteraDeudores(token, searchParams);
      
      if (response.success && response.data.success) {
        const carteraTransformada = response.data.facturas.map(transformApiDataToCarteraDeudor);
        return {
          data: carteraTransformada,
          total_pages: response.total_pages
        };
      }
      
      return { data: [], total_pages: 1 };
    } catch (error) {
      console.error('[useCarteraDeudores] - Error al obtener datos para Excel:', error);
      return { data: [], total_pages: 1 };
    }
  }, [formData, foundCollectorDocument, token]);

  // Funciones de formateo (sin cambios)
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  const formatNumber = useCallback((value: number): string => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('es-CO').format(value);
  }, []);

  const formatCurrency = useCallback((value: number): string => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  }, []);

  // Funciones para cerrar alertas
  const closeAlertNotification = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertNotification: false
    }));
  }, []);

  const closeErrorAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showErrorAlert: false
    }));
  }, []);

  return {
    // Estados
    formData,
    carteraDeudores,
    isLoading,
    foundCollectorDocument,
    alertState,
    currentPage,
    totalPages,
    selectedRows,
    selectAll,
    
    // Funciones
    handleInputChange,
    handleFoundCollector,
    handleSearch,
    handleClearSearch,
    handleRowSelect,
    handleSelectAll,
    handlePageChange,
    fetchAllDataForExcel,
    formatDate,
    formatNumber,
    formatCurrency,
    closeAlertNotification,
    closeErrorAlert
  };
}; 