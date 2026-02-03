import { useState, useCallback } from 'react';
import { obtenerReporteProduccionNacionalCacao } from '../adapters/reporteProduccionNacionalCacao.adapter';
import { 
    ReporteProduccionNacionalCacaoMapped,
    ReporteProduccionNacionalCacaoParams,
} from '../models/reporteProduccionNacionalCacao.model';

// Estado inicial para los datos del reporte
const INITIAL_DATA: ReporteProduccionNacionalCacaoMapped = {
    success: false,
    count: 0,
    total_pages: 0,
    current_page: 1,
    next: null,
    previous: null,
    consolidado: [],
    totales_por_mes: {
        enero: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        febrero: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        marzo: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        abril: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        mayo: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        junio: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        julio: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        agosto: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        septiembre: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        octubre: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        noviembre: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 },
        diciembre: { total_kilos: 0, total_cuota_fomento: 0, total_toneladas: 0 }
    }
};

/**
 * Hook personalizado para manejar el reporte de producción nacional de cacao
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar el reporte
 */
export const useReporteProduccionNacionalCacao = (token: string) => {
    // Estados principales
    const [reporteData, setReporteData] = useState<ReporteProduccionNacionalCacaoMapped>(INITIAL_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
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

    // Función principal para obtener el reporte
    const fetchReporte = useCallback(async (params?: ReporteProduccionNacionalCacaoParams) => {
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

            console.log('[useReporteProduccionNacionalCacao] - Iniciando consulta con parámetros:', params);

            const response = await obtenerReporteProduccionNacionalCacao(token, params || {});

            // Mapear la respuesta al formato que usaremos
            const mappedResponse: ReporteProduccionNacionalCacaoMapped = {
                success: response.success,
                count: response.count,
                total_pages: response.total_pages,
                current_page: response.current_page,
                next: response.next,
                previous: response.previous,
                consolidado: response.data.data.consolidado,
                totales_por_mes: response.data.data.totales_por_mes
            };

            setReporteData(mappedResponse);
            

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al obtener el reporte';
            console.error('[useReporteProduccionNacionalCacao] - Error:', err);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setReporteData(INITIAL_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para manejar el cambio de página
    const handlePageChange = useCallback((newPage: number, params?: ReporteProduccionNacionalCacaoParams) => {
        const updatedParams = {
            ...params,
            page: newPage
        };
        fetchReporte(updatedParams);
    }, [fetchReporte]);

    // Función para limpiar filtros
    const clearFilters = useCallback(() => {
        setReporteData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función para limpiar los datos del reporte
    const clearReporte = useCallback(() => {
        setReporteData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    // Función para obtener todos los datos para Excel
    const fetchAllData = useCallback(async (page: number, params?: ReporteProduccionNacionalCacaoParams) => {
        if (!token) {
            console.error('[useReporteProduccionNacionalCacao] - No hay token de autenticación disponible');
            return { data: [], total_pages: 0 };
        }

        try {
            // Usar los parámetros pasados, incluyendo la página
            const requestParams = { ...params, page };
            
            console.log('[useReporteProduccionNacionalCacao] - Obteniendo datos para Excel con parámetros:', requestParams);

            const response = await obtenerReporteProduccionNacionalCacao(token, requestParams);
            
            return {
                data: response.data.data.consolidado,
                total_pages: response.total_pages
            };
        } catch (error) {
            console.error('[useReporteProduccionNacionalCacao] - Error en fetchAllData:', error);
            return {
                data: [],
                total_pages: 0
            };
        }
    }, [token]);

    return {
        // Estados
        reporteData,
        isLoading,
        error,
        
        // Estados de alertas
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        
        // Funciones
        fetchReporte,
        handlePageChange,
        clearFilters,
        clearReporte,
        fetchAllData,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 