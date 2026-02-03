import { useState, useCallback } from 'react';
import { getReporteAcuerdosPago } from '../adapters/reporteAcuerdosPago.adapter';
import { 
    ReporteAcuerdosPagoMapped,
    ReporteAcuerdosPagoParams,
} from '../models/reporteAcuerdosPago.model';

// Estado inicial para los parámetros de consulta
const INITIAL_PARAMS: ReporteAcuerdosPagoParams = {
    page: 1,
    page_size: 10
};

// Estado inicial para los datos del reporte
const INITIAL_DATA: ReporteAcuerdosPagoMapped = {
    success: false,
    acuerdos: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
    next: null,
    previous: null
};

/**
 * Hook personalizado para manejar el reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar el reporte
 */
export const useReporteAcuerdosPago = (token: string) => {
    // Estados principales
    const [reporteData, setReporteData] = useState<ReporteAcuerdosPagoMapped>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para parámetros de consulta
    const [params, setParams] = useState<ReporteAcuerdosPagoParams>(INITIAL_PARAMS);
    
    // Estados para alertas
    const [showAlertNotification, setShowAlertNotification] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState('');

    // Función para limpiar alertas
    const clearAlerts = useCallback(() => {
        setShowAlertNotification(false);
        setShowErrorAlert(false);
        setAlertMessage('');
        setErrorAlertMessage('');
    }, []);

    // Función para mostrar alerta de éxito
    const showSuccessAlert = useCallback((message: string) => {
        clearAlerts();
        setAlertMessage(message);
        setShowAlertNotification(true);
    }, [clearAlerts]);

    // Función para mostrar alerta de error
    const showErrorAlertMessage = useCallback((message: string) => {
        clearAlerts();
        setErrorAlertMessage(message);
        setShowErrorAlert(true);
    }, [clearAlerts]);

    // Función para actualizar parámetros de consulta
    const updateParams = useCallback((newParams: Partial<ReporteAcuerdosPagoParams>) => {
        setParams(prev => ({
            ...prev,
            ...newParams,
            // Resetear a página 1 cuando se cambian los filtros
            page: newParams.page !== undefined ? newParams.page : 1
        }));
    }, []);

    // Función para limpiar filtros
    const clearFilters = useCallback(() => {
        setParams(INITIAL_PARAMS);
        setReporteData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función principal para obtener el reporte
    const fetchReporte = useCallback(async (customParams?: Partial<ReporteAcuerdosPagoParams>) => {
        if (!token) {
            const errorMsg = 'No hay token de autenticación disponible';
            setError(errorMsg);
            showErrorAlertMessage(errorMsg);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            clearAlerts();

            // Usar parámetros personalizados o los del estado
            const requestParams = customParams ? { ...params, ...customParams } : params;

            // Si se pasan parámetros personalizados, actualizar el estado para conservarlos
            if (customParams) {
                setParams(prev => ({ ...prev, ...customParams }));
            }

            const response = await getReporteAcuerdosPago(token, requestParams);

            setReporteData(response);

        } catch (err) {
            let errorMessage = 'Error inesperado al obtener el reporte';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message);
            }
            
            console.error('[useReporteAcuerdosPago] - Error:', err);
            console.error('[useReporteAcuerdosPago] - Error message:', errorMessage);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setReporteData(INITIAL_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, params, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para cambiar de página
    const handlePageChange = useCallback((newPage: number) => {
        const newParams = { ...params, page: newPage };
        setParams(newParams);
        
        // Hacer la consulta inmediatamente con los nuevos parámetros
        const fetchWithNewPage = async () => {
            try {
                setIsLoading(true);
                setError(null);
                clearAlerts();

                console.log('[useReporteAcuerdosPago] - Cambiando a página:', newPage);
                console.log('[useReporteAcuerdosPago] - Parámetros completos:', newParams);

                const response = await getReporteAcuerdosPago(token, newParams);
                setReporteData(response);
                
                if (response.acuerdos.length === 0) {
                    showSuccessAlert('No se encontraron registros para los criterios de búsqueda especificados.');
                }
            } catch (err) {
                let errorMessage = 'Error inesperado al obtener el reporte';
                
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (typeof err === 'string') {
                    errorMessage = err;
                } else if (err && typeof err === 'object' && 'message' in err) {
                    errorMessage = String(err.message);
                }
                
                console.error('[useReporteAcuerdosPago] - Error al cambiar página:', err);
                console.error('[useReporteAcuerdosPago] - Error message:', errorMessage);
                
                setError(errorMessage);
                showErrorAlertMessage(errorMessage);
                setReporteData(INITIAL_DATA);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWithNewPage();
    }, [token, params, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para cambiar el tamaño de página
    const handlePageSizeChange = useCallback((newPageSize: number) => {
        updateParams({ page_size: newPageSize, page: 1 });
    }, [updateParams]);

    // Función para aplicar filtros
    const applyFilters = useCallback((filters: Partial<ReporteAcuerdosPagoParams>) => {
        updateParams({ ...filters, page: 1 }); // Resetear a página 1 al aplicar filtros
    }, [updateParams]);

    // Función para refrescar datos
    const refreshData = useCallback(() => {
        fetchReporte();
    }, [fetchReporte]);

    // Función para obtener todos los datos para Excel
    const fetchAllData = useCallback(async (page: number) => {
        if (!token) {
            console.error('[useReporteAcuerdosPago] - No hay token de autenticación disponible');
            return { data: [], total_pages: 0 };
        }

        try {
            // Usar los parámetros actuales del estado
            const requestParams = { ...params, page };
            
            const response = await getReporteAcuerdosPago(token, requestParams);
            
            return {
                data: response.acuerdos,
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('[useReporteAcuerdosPago] - Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    }, [token, params]);

    return {
        // Estados
        reporteData,
        isLoading,
        error,
        params,
        
        // Estados de alertas
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        
        // Funciones
        fetchReporte,
        updateParams,
        clearFilters,
        handlePageChange,
        handlePageSizeChange,
        applyFilters,
        refreshData,
        fetchAllData,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 