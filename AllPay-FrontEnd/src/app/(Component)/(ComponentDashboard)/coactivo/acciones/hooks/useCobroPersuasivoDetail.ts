import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  getCobroPersuasivoDetail,
  getAllCobroPersuasivoDetailForExport,
  downloadCobroPersuasivoDocumento
} from '../adapters/cobroPersuasivoDetail.adapter';
import {
  CobroPersuasivoTabla,
  CobroPersuasivoDetailParams
} from '../models/cobroPersuasivoDetail.model';

// Interface para el estado de alertas
export interface AlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
}

// Función para transformar datos de API a estructura de tabla (actualizada para nueva estructura)
const transformApiDataToTabla = (apiData: any): CobroPersuasivoTabla => {
  // Extraer información del documento adjunto
  const documentoAdjunto = apiData.documento_adjunto || {};
  const tieneDocumento = documentoAdjunto.tiene_documento || false;
  const nombreArchivo = documentoAdjunto.nombre_archivo || null;
  const urlDescarga = documentoAdjunto.url_descarga || null;

  return {
    idCobroPersuasivo: apiData.id_cobro_coactivo ?? apiData.id_cobro_persuasivo ?? apiData.id ?? 0,
    codigoAccion: apiData.cod_accion_registrada ?? apiData.codigo_accion ?? '',
    descripcion: apiData.descripcion ?? '',
    consecutivo: apiData.consecutivo ?? '',
    fechaRegistro: apiData.fecha_registro ?? apiData.fecha_creacion ?? '',
    accionRegistrar: apiData.accion_registrada ?? apiData.accion_cobro?.nombre ?? 'Sin acción',
    nombreRecaudador: apiData.nombre_recaudador ?? '',
    emailRecaudador: apiData.email_recaudador ?? '',
    celularRecaudador: apiData.celular_recaudador ?? '',
    aplicarPlantilla: apiData.plantilla ? 'Sí' : 'No',
    documentoAdjunto: tieneDocumento && nombreArchivo ? nombreArchivo : 'Sin documento',
    documentoAdjuntoUrl: urlDescarga,
    fechaCompra: apiData.fecha_compra ?? '',
    personaCrea: apiData.persona_crea ?? '',
    // Datos de factura
    nroFactura: apiData.nro_factura_unica ?? 0,
    // Nuevos campos de la respuesta actualizada
    estado: apiData.estado ?? '',
    documentoRecaudador: apiData.documento_recaudador ?? '',
    plantilla: apiData.plantilla ?? false,
    tieneDocumento: tieneDocumento,
    nombreArchivo: nombreArchivo,
    // URL del documento persuasivo generado por el sistema
    docPersuasivoUrl: apiData.doc_persuasivo_url ?? null
  };
};

// Hook personalizado para manejar los detalles de cobros persuasivos
export const useCobroPersuasivoDetail = (facturaId?: string | null) => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Estados principales
  const [cobrosPersuasivos, setCobrosPersuasivos] = useState<CobroPersuasivoTabla[]>([]);
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
  const handleLoadCobrosPersuasivos = useCallback(async (params: CobroPersuasivoDetailParams = {}) => {
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
      const searchParams: CobroPersuasivoDetailParams = {
        page: params.page || currentPage,
        page_size: params.page_size || 10,
        ...params
      };

      // Llamar a la API
      const response = await getCobroPersuasivoDetail(token, facturaId, searchParams);

      if (response.success) {
        // Transformar datos de API a estructura de tabla
        const cobrosTransformados = response.data.map(transformApiDataToTabla);

        setCobrosPersuasivos(cobrosTransformados);
        setTotalRecords(response.count);
        
        // Calcular total de páginas usando total_pages del backend o calculando
        const calculatedPages = response.total_pages || Math.ceil(response.count / 10);
        setTotalPages(calculatedPages);

        // Solo mostrar alerta si hay datos, si no hay datos mantener tabla vacía sin alertas
        if (response.count > 0) {
          setAlertState({
            showAlertNotification: false,
            alertMessage: '',
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
      console.error('[useCobroPersuasivoDetail] - Error al cargar cobros persuasivos:', error);
      
      setCobrosPersuasivos([]);
      setTotalRecords(0);
      setTotalPages(1);
      
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error.message || 'Error al cargar los cobros persuasivos'
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, facturaId, currentPage]);

  // Función para obtener todos los cobros persuasivos para exportación
  const fetchAllDataForExcel = useCallback(async (): Promise<{ data: CobroPersuasivoTabla[]; total_pages: number }> => {
    if (!token || !facturaId) {
      throw new Error('Token o ID de factura no disponible');
    }

    try {
      
      const allCobros = await getAllCobroPersuasivoDetailForExport(token, facturaId);
      const cobrosTransformados = allCobros.map(transformApiDataToTabla);
      
      
      return {
        data: cobrosTransformados,
        total_pages: 1 // Todos los datos en una sola página para exportación
      };
    } catch (error: any) {
      console.error('[useCobroPersuasivoDetail] - Error al obtener datos para exportación:', error);
      throw error;
    }
  }, [token, facturaId]);

  // Función para descargar documento
  const handleDownloadDocument = useCallback(async (cobroId: number): Promise<void> => {
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
      
      const blob = await downloadCobroPersuasivoDocumento(token, cobroId);
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cobro_persuasivo_${cobroId}.pdf`;
      
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
      console.error('[useCobroPersuasivoDetail] - Error al descargar documento:', error);
      setAlertState({
        showAlertNotification: false,
        alertMessage: '',
        showErrorAlert: true,
        errorAlertMessage: error.message || 'Error al descargar el documento'
      });
    }
  }, [token]);

  // Función para cambiar de página
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // Funciones para cerrar alertas
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

  // Cargar datos automáticamente cuando cambie la página o facturaId
  useEffect(() => {
    if (facturaId && token) {
      handleLoadCobrosPersuasivos();
    }
  }, [currentPage, facturaId, token, handleLoadCobrosPersuasivos]);

  return {
    // Estados principales
    cobrosPersuasivos,
    isLoading,
    
    // Estados de paginación
    currentPage,
    totalPages,
    totalRecords,
    
    // Estados de alertas
    alertState,
    
    // Funciones principales
    handleLoadCobrosPersuasivos,
    fetchAllDataForExcel,
    handleDownloadDocument,
    handlePageChange,
    
    // Funciones de alertas
    closeAlertNotification,
    closeErrorAlert,
    
    // Función de transformación (exportada para uso externo si es necesario)
    transformApiDataToTabla,
    
    // Función para refrescar datos (útil después de editar)
    refreshData: () => handleLoadCobrosPersuasivos()
  };
}; 