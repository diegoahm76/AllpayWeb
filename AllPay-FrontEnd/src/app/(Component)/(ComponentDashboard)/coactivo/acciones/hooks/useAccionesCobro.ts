import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  getAccionesCobro,
  getAllAccionesCobroForExport,
  downloadAccionDocumento
} from '../adapters/accionesCobro.adapter';
import {
  AccionCobroPersuasivo,
  AccionCobroTabla,
  AccionesCobroBusquedaParams
} from '../models/accionesCobro.model';

// Interface para el estado de alertas
export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
}

// Función para transformar datos de API a estructura de tabla
const transformApiDataToTabla = (apiData: AccionCobroPersuasivo): AccionCobroTabla => {
  return {
    idRegistro: apiData.id,
    fechaRegistro: apiData.fecha_registro,
    nombreRecaudador: apiData.nombre_recaudador,
    celular: apiData.celular,
    correoElectronico: apiData.correo_electronico,
    fechaCompra: apiData.fecha_compra,
    nroFacturaUnica: apiData.nro_factura_unica,
    accionRegistrada: apiData.accion_registrada,
    plantilla: apiData.plantilla,
    descripcion: apiData.descripcion,
    documento: apiData.documento || 'Sin documento',
    urlDocumento: apiData.url_documento
  };
};

// Hook personalizado para manejar las acciones de cobro
export const useAccionesCobro = (facturaId?: string | null) => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [accionesCobro, setAccionesCobro] = useState<AccionCobroTabla[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
  const [totalRecords, setTotalRecords] = useState(0);

  // Función de búsqueda principal
  const handleLoadAcciones = useCallback(async (params: AccionesCobroBusquedaParams = {}) => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Token de autenticación no disponible'
      });
      return;
    }

    if (!facturaId) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'ID de factura no disponible'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Preparar parámetros de búsqueda
      const searchParams: AccionesCobroBusquedaParams = {
        page: currentPage,
        page_size: 10,
        ...params
      };

      // Llamar a la API
      const response = await getAccionesCobro(token, facturaId, searchParams);

      if (response.success) {
        // Transformar datos de API a estructura de tabla
        const accionesTransformadas = response.data.map(transformApiDataToTabla);

        setAccionesCobro(accionesTransformadas);
        setTotalRecords(response.count);
        
        // Calcular total de páginas usando total_pages del backend o calculando
        const calculatedPages = response.total_pages || Math.ceil(response.count / 10);
        setTotalPages(calculatedPages);

        // Solo mostrar alerta si hay datos, si no hay datos mantener tabla vacía sin alertas
        if (response.count > 0) {
          setAlertState({
            showAlertNotification: true,
            alertMessage: `${response.count} acciones de cobro encontradas.`,
            showErrorAlert: false,
            errorAlertMessage: ''
          });
        } else {
          // No mostrar alertas cuando no hay datos, solo mantener la interfaz limpia
          setAlertState({
            showAlertNotification: false,
            alertMessage: '',
            showErrorAlert: false,
            errorAlertMessage: ''
          });
        }

      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error: any) {
      console.error('[useAccionesCobro] - Error al cargar acciones:', error);
      
      setAccionesCobro([]);
      setTotalRecords(0);
      setTotalPages(1);
      
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error.message || 'Error al cargar las acciones de cobro'
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, facturaId, currentPage]);

  // Función para obtener todas las acciones para exportación
  const fetchAllDataForExcel = useCallback(async (): Promise<{ data: AccionCobroTabla[]; total_pages: number }> => {
    if (!token || !facturaId) {
      throw new Error('Token o ID de factura no disponible');
    }

    try {
      
      const allAcciones = await getAllAccionesCobroForExport(token, facturaId);
      const accionesTransformadas = allAcciones.map(transformApiDataToTabla);
      
      
      return {
        data: accionesTransformadas,
        total_pages: 1 // Todos los datos en una sola página para exportación
      };
    } catch (error: any) {
      console.error('[useAccionesCobro] - Error al obtener datos para exportación:', error);
      throw error;
    }
  }, [token, facturaId]);

  // Función para descargar documento
  const handleDownloadDocument = useCallback(async (accionId: number): Promise<void> => {
    if (!token) {
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: 'Token de autenticación no disponible'
      });
      return;
    }

    try {
      
      const blob = await downloadAccionDocumento(token, accionId);
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `accion_cobro_${accionId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setAlertState({
        showAlertNotification: true,
        alertMessage: 'Documento descargado exitosamente',
        showErrorAlert: false,
        errorAlertMessage: ''
      });
    } catch (error: any) {
      console.error('[useAccionesCobro] - Error al descargar documento:', error);
      
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error.message || 'Error al descargar el documento'
      });
    }
  }, [token]);

  // Función para cambiar página
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [totalPages, currentPage]);

  // Funciones para formatear datos
  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  const formatCelular = useCallback((celular: string): string => {
    if (!celular) return '';
    return celular.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }, []);

  const formatEmail = useCallback((email: string): string => {
    if (!email) return '';
    return email.toLowerCase();
  }, []);

  const formatDescripcion = useCallback((descripcion: string): string => {
    if (!descripcion) return '';
    return descripcion.length > 100 ? `${descripcion.substring(0, 100)}...` : descripcion;
  }, []);

  // Funciones para alertas
  const closeAlertNotification = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showAlertNotification: false,
      alertMessage: ''
    }));
  }, []);

  const closeErrorAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      showErrorAlert: false,
      errorAlertMessage: ''
    }));
  }, []);

  // Cargar acciones cuando cambie la página o el ID de factura
  useEffect(() => {
    if (facturaId) {
      handleLoadAcciones();
    }
  }, [facturaId, currentPage]);

  return {
    // Estados
    accionesCobro,
    isLoading,
    alertState,
    currentPage,
    totalPages,
    totalRecords,

    // Funciones
    handleLoadAcciones,
    handlePageChange,
    handleDownloadDocument,
    fetchAllDataForExcel,

    // Funciones de formateo
    formatDate,
    formatCelular,
    formatEmail,
    formatDescripcion,

    // Funciones de alertas
    closeAlertNotification,
    closeErrorAlert
  };
}; 