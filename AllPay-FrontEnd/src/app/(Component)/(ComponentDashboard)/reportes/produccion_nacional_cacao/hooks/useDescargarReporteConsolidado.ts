import { useState, useCallback } from 'react';
import { descargarReporteConsolidado } from '../adapters/descargarReporteConsolidado.adapter';
import { 
    DescargarReporteConsolidadoMapped,
    DescargarReporteConsolidadoParams,
} from '../models/descargarReporteConsolidadoProduccion.model';

// Estado inicial para los datos de descarga
const INITIAL_DATA: DescargarReporteConsolidadoMapped = {
    success: false,
    detail: '',
    id_documento: 0,
    url_documento: '',
    fecha_generacion: null,
    total_ubicaciones: 0,
    periodo: ''
};

/**
 * Hook personalizado para manejar la generación del documento Excel del reporte consolidado
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar la generación del documento
 */
export const useDescargarReporteConsolidado = (token: string) => {
    // Estados principales
    const [descargaData, setDescargaData] = useState<DescargarReporteConsolidadoMapped>(INITIAL_DATA);
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

    // Función principal para generar el documento
    const descargarReporte = useCallback(async (params?: DescargarReporteConsolidadoParams) => {
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

            console.log('[useDescargarReporteConsolidado] - Iniciando generación de documento Excel con parámetros:', params);

            const response = await descargarReporteConsolidado(token, params || {});

            // Mapear la respuesta al formato que usaremos
            const mappedResponse: DescargarReporteConsolidadoMapped = {
                success: response.success,
                detail: response.detail,
                id_documento: response.data.id_documento,
                url_documento: response.data.url_documento,
                fecha_generacion: response.data.fecha_generacion,
                total_ubicaciones: response.data.total_ubicaciones,
                periodo: response.data.periodo
            };

            setDescargaData(mappedResponse);

            // Si el documento se generó exitosamente, abrirlo en nueva pestaña
            if (mappedResponse.success && mappedResponse.url_documento) {
                console.log('[useDescargarReporteConsolidado] - Abriendo documento Excel en nueva pestaña:', mappedResponse.url_documento);
                
                // Abrir el documento en una nueva pestaña
                window.open(mappedResponse.url_documento, '_blank');
                
                // Mostrar mensaje de éxito con información adicional
                const successMsg = `${mappedResponse.detail}`;
                showSuccessAlert(successMsg);
            } else {
                showErrorAlertMessage('No se pudo obtener la URL del documento Excel generado');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al generar el documento Excel';
            console.error('[useDescargarReporteConsolidado] - Error:', err);
            
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
            
            // Limpiar datos en caso de error
            setDescargaData(INITIAL_DATA);
        } finally {
            setIsLoading(false);
        }
    }, [token, clearAlerts, showSuccessAlert, showErrorAlertMessage]);

    // Función para limpiar los datos del documento
    const clearDescarga = useCallback(() => {
        setDescargaData(INITIAL_DATA);
        setError(null);
        clearAlerts();
    }, [clearAlerts]);

    return {
        // Estados
        descargaData,
        isLoading,
        error,
        
        // Estados de alertas
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,
        
        // Funciones
        descargarReporte,
        clearDescarga,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 