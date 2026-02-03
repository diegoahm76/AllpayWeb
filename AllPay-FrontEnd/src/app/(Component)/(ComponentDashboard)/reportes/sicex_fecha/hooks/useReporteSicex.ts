import { useState, useCallback } from 'react';
import { getReporteSicex } from '../adapters/reporteSicex.adapter';
import { 
    ReporteSicexMapped,
    ReporteSicexParams,
} from '../models/reporteSicex.model';

// Estado inicial para los parámetros de consulta
const INITIAL_PARAMS: ReporteSicexParams = {
    page: 1,
    page_size: 10
};

// Estado inicial para los datos del reporte
const INITIAL_DATA: ReporteSicexMapped = {
    success: false,
    registros: [],
    count: 0,
    total_pages: 1,
    current_page: 1,
    next: null,
    previous: null,
    total_peso: '0',
    total_toneladas: '0',
    total_valor_cif: '$ 0',
    total_valor_fob: '$ 0'
};

/**
 * Hook personalizado para manejar el reporte SICEX
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar el reporte
 */
export const useReporteSicex = (token: string) => {
    // Estados principales
    const [reporteData, setReporteData] = useState<ReporteSicexMapped>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para parámetros de consulta
    const [params, setParams] = useState<ReporteSicexParams>(INITIAL_PARAMS);
    
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
    const updateParams = useCallback((newParams: Partial<ReporteSicexParams>) => {
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
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función principal para obtener el reporte
    const fetchReporte = useCallback(async (customParams?: Partial<ReporteSicexParams>) => {
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

            const response = await getReporteSicex(token, requestParams);

            setReporteData(response);
            
            if (response.registros.length === 0) {
                showSuccessAlert('No se encontraron registros para los criterios de búsqueda especificados.');
            } 

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener el reporte';
            console.error('[useReporteSicex] - Error:', err);
            
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
    const fetchAllData = useCallback(async (page: number) => {
        if (!token) {
            console.error('[useReporteSicex] - No hay token de autenticación disponible');
            return { data: [], total_pages: 0 };
        }

        try {
            // Usar los parámetros actuales del estado
            const requestParams = { ...params, page };
            

            const response = await getReporteSicex(token, requestParams);
            
            return {
                data: response.registros,
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('[useReporteSicex] - Error en fetchAllData:', error);
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