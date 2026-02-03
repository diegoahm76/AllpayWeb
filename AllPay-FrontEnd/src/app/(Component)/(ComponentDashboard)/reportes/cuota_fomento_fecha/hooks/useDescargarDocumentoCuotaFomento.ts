import { useState, useCallback } from 'react';
import { descargarDocumentoCuotaFomento } from '../adapters/descargarDocumentoCuotaFomento.adapter';
import { 
    DescargarDocumentoCuotaFomentoMapped,
    DescargarDocumentoCuotaFomentoParams,
} from '../models/descargarDocumentoCuotaFomento.model';

// Estado inicial para los datos de descarga
const INITIAL_DATA: DescargarDocumentoCuotaFomentoMapped = {
    success: false,
    detail: '',
    id_documento_generado: 0,
    documento_generado: '',
    archivo: ''
};

/**
 * Hook personalizado para manejar la generación del documento del reporte de cuota fomento
 * @param token Token de autenticación JWT
 * @returns Objeto con estados y funciones para manejar la generación del documento
 */
export const useDescargarDocumentoCuotaFomento = (token: string) => {
    // Estados principales
    const [descargaData, setDescargaData] = useState<DescargarDocumentoCuotaFomentoMapped>(INITIAL_DATA);
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
    const descargarReporte = useCallback(async (params?: DescargarDocumentoCuotaFomentoParams) => {
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

            console.log('[useDescargarDocumentoCuotaFomento] - Iniciando generación de documento con parámetros:', params);

            const response = await descargarDocumentoCuotaFomento(token, params || {});

            // Mapear la respuesta al formato que usaremos
            const mappedResponse: DescargarDocumentoCuotaFomentoMapped = {
                success: response.success,
                detail: response.detail,
                id_documento_generado: response.data.id_documento_generado,
                documento_generado: response.data.documento_generado,
                archivo: response.data.archivo
            };

            setDescargaData(mappedResponse);
            
            // Si el documento se generó exitosamente, abrirlo en nueva pestaña
            if (mappedResponse.success && mappedResponse.archivo) {
                console.log('[useDescargarDocumentoCuotaFomento] - Abriendo documento en nueva pestaña:', mappedResponse.archivo);
                
                // Abrir el documento en una nueva pestaña
                window.open(mappedResponse.archivo, '_blank');
                
                showSuccessAlert(mappedResponse.detail || 'Documento generado exitosamente');
            } else {
                showErrorAlertMessage('No se pudo obtener la URL del documento generado');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error inesperado al generar el documento';
            console.error('[useDescargarDocumentoCuotaFomento] - Error:', err);
            
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