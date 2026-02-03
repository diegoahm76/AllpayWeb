import { useState, useCallback } from 'react';
import { getPagosLineaCuotaFomento } from '../adapters/pagosLineaCuotaFomento.adapter';
import { 
    PagosLineaCuotaFomentoMapped,
    PagosLineaCuotaFomentoParams,
} from '../models/pagosLineaCuotaFomento.model';

// Estado inicial para los parámetros de consulta
const INITIAL_PARAMS: PagosLineaCuotaFomentoParams = {
    page: 1,
    page_size: 10
};

// Estado inicial para los datos del reporte
const INITIAL_DATA: PagosLineaCuotaFomentoMapped = {
    success: false,
    registros: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
    next: null,
    previous: null,
    total_cuota: '',
    total_interes: ''
};

/**
 * Hook personalizado para manejar el reporte de pagos en línea de cuota fomento
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar el reporte
 */
export const usePagosLineaCuotaFomento = (token: string) => {
    // Estados principales
    const [reporteData, setReporteData] = useState<PagosLineaCuotaFomentoMapped>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para parámetros de consulta
    const [params, setParams] = useState<PagosLineaCuotaFomentoParams>(INITIAL_PARAMS);
    
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
    const updateParams = useCallback((newParams: Partial<PagosLineaCuotaFomentoParams>) => {
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
    const fetchReporte = useCallback(async (customParams?: Partial<PagosLineaCuotaFomentoParams>) => {
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

            const response = await getPagosLineaCuotaFomento(token, requestParams);

            setReporteData(response);
            
            if (response.registros.length === 0) {
                showSuccessAlert('No se encontraron registros para los criterios de búsqueda especificados.');
            } 

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener el reporte';
            console.error('[usePagosLineaCuotaFomento] - Error:', err);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setReporteData(INITIAL_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, params, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para cambiar de página
    const handlePageChange = useCallback((page: number) => {
        updateParams({ page });
        fetchReporte({ page });
    }, [updateParams, fetchReporte]);

    // Función para limpiar el reporte
    const clearReporte = useCallback(() => {
        setReporteData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función para resetear parámetros de búsqueda
    const resetSearchParams = useCallback(() => {
        setParams(INITIAL_PARAMS);
        clearReporte();
    }, [clearReporte]);

    // Función para obtener todos los datos para Excel
    const fetchAllData = useCallback(async (_page: number) => {
        if (!token) {
            return { data: [], total_pages: 0 };
        }

        try {
            // Usar los parámetros actuales del estado pero con sin_paginacion=true
            const requestParams = { 
                ...params, 
                page: 1, // Siempre página 1 cuando se obtienen todos los datos
                sin_paginacion: true 
            };
            

            const response = await getPagosLineaCuotaFomento(token, requestParams);
            
            return {
                data: response.registros,
                total_pages: response.total_pages
            };
        } catch (error) {
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
        handlePageChange,
        updateParams,
        clearFilters,
        clearReporte,
        resetSearchParams,
        fetchAllData,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 