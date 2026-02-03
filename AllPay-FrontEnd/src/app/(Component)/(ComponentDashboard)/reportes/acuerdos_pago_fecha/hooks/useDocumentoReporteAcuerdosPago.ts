import { useState, useCallback } from 'react';
import { getDocumentoReporteAcuerdosPago } from '../adapters/documentoReporteAcuerdosPago.adapter';
import { 
    DocumentoReporteAcuerdosPagoMapped, 
    DocumentoReporteAcuerdosPagoParams 
} from '../models/documentoReporteAcuerdosPago.model';

/**
 * Hook personalizado para manejar la generación y descarga del documento del reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @returns Objeto con estado y funciones para generar y descargar el documento
 */
export const useDocumentoReporteAcuerdosPago = (token: string) => {
    // Estados para el documento
    const [documentoData, setDocumentoData] = useState<DocumentoReporteAcuerdosPagoMapped>({
        success: false,
        detail: '',
        data: {
            id_documento_generado: 0,
            documento_generado: '',
            archivo: ''
        }
    });

    // Estados de carga y error
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para alertas
    const [showAlertNotification, setShowAlertNotification] = useState<boolean>(false);
    const [alertMessage, setAlertMessage] = useState<string>('');
    const [showErrorAlert, setShowErrorAlert] = useState<boolean>(false);
    const [errorAlertMessage, setErrorAlertMessage] = useState<string>('');

    /**
     * Genera el documento del reporte y abre el archivo en una nueva pestaña
     * @param params Parámetros opcionales de filtro
     */
    const generarYDescargarDocumento = useCallback(async (params?: DocumentoReporteAcuerdosPagoParams) => {
        if (!token) {
            console.error('[useDocumentoReporteAcuerdosPago] - No hay token disponible');
            setError('No hay token de autenticación disponible');
            return;
        }

        setIsLoading(true);
        setError(null);
        clearAlerts();

        try {
            console.log('[useDocumentoReporteAcuerdosPago] - Iniciando generación de documento con parámetros:', params);

            const response = await getDocumentoReporteAcuerdosPago(token, params);

            console.log('[useDocumentoReporteAcuerdosPago] - Documento generado exitosamente:', response);

            setDocumentoData(response);
            
            // Si el documento se generó exitosamente y tiene URL de archivo, abrirlo en nueva pestaña
            if (response.success && response.data.archivo) {
                console.log('[useDocumentoReporteAcuerdosPago] - Abriendo documento en nueva pestaña:', response.data.archivo);
                
                // Abrir el archivo en una nueva pestaña
                window.open(response.data.archivo, '_blank');
                
                showSuccessAlert(response.detail || 'Documento generado y abierto exitosamente');
            } else {
                showErrorAlertMessage('No se pudo obtener la URL del documento generado');
            }

        } catch (error) {
            console.error('[useDocumentoReporteAcuerdosPago] - Error al generar documento:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Error inesperado al generar el documento';
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    /**
     * Limpia los datos del documento
     */
    const clearDocumento = useCallback(() => {
        setDocumentoData({
            success: false,
            detail: '',
            data: {
                id_documento_generado: 0,
                documento_generado: '',
                archivo: ''
            }
        });
        setError(null);
        clearAlerts();
    }, []);

    /**
     * Muestra una alerta de éxito
     */
    const showSuccessAlert = useCallback((message: string) => {
        setAlertMessage(message);
        setShowAlertNotification(true);
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            setShowAlertNotification(false);
        }, 5000);
    }, []);

    /**
     * Muestra una alerta de error
     */
    const showErrorAlertMessage = useCallback((message: string) => {
        setErrorAlertMessage(message);
        setShowErrorAlert(true);
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            setShowErrorAlert(false);
        }, 5000);
    }, []);

    /**
     * Limpia todas las alertas
     */
    const clearAlerts = useCallback(() => {
        setShowAlertNotification(false);
        setShowErrorAlert(false);
        setAlertMessage('');
        setErrorAlertMessage('');
    }, []);

    return {
        // Estados
        documentoData,
        isLoading,
        error,
        showAlertNotification,
        alertMessage,
        showErrorAlert,
        errorAlertMessage,

        // Funciones
        generarYDescargarDocumento,
        clearDocumento,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 