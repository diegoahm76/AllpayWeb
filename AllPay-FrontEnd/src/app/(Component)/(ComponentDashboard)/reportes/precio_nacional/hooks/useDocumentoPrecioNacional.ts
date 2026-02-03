import { useState, useCallback } from 'react';
import { generarDocumentoPrecioNacional } from '../adapters/documentoPrecioNacional.adapter';
import { 
    DocumentoPrecioNacionalMapped, 
    DocumentoPrecioNacionalParams 
} from '../models/documentoPrecioNacional.model';

/**
 * Hook personalizado para manejar la generación de documentos del reporte de precio nacional
 * @param token Token de autenticación JWT
 * @returns Objeto con estado y funciones para generar documentos
 */
export const useDocumentoPrecioNacional = (token: string) => {
    // Estados para el documento
    const [documentoData, setDocumentoData] = useState<DocumentoPrecioNacionalMapped>({
        success: false,
        id_documento: 0,
        url_documento: '',
        fecha_generacion: null,
        total_recaudadores: 0,
        periodo: '',
        detail: ''
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
     * Genera un documento PDF del reporte de precio nacional
     * @param params Parámetros para la generación del documento
     */
    const generarDocumento = useCallback(async (params: DocumentoPrecioNacionalParams) => {
        if (!token) {
            console.error('[useDocumentoPrecioNacional] - No hay token disponible');
            setError('No hay token de autenticación disponible');
            return;
        }

        setIsLoading(true);
        setError(null);
        clearAlerts();

        try {
            console.log('[useDocumentoPrecioNacional] - Iniciando generación de documento con parámetros:', params);

            const response = await generarDocumentoPrecioNacional(token, params);

            console.log('[useDocumentoPrecioNacional] - Documento generado exitosamente:', response);

            setDocumentoData(response);
            showSuccessAlert(response.detail || 'Documento generado exitosamente');

        } catch (error) {
            console.error('[useDocumentoPrecioNacional] - Error al generar documento:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Error inesperado al generar el documento';
            setError(errorMessage);
            showErrorAlertMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    /**
     * Descarga el documento generado
     */
    const descargarDocumento = useCallback(() => {
        if (documentoData.url_documento) {
            console.log('[useDocumentoPrecioNacional] - Descargando documento:', documentoData.url_documento);
            
            // Crear un enlace temporal para descargar el archivo
            const link = document.createElement('a');
            link.href = documentoData.url_documento;
            link.download = `reporte-precio-nacional-${documentoData.periodo}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showSuccessAlert('Descarga iniciada exitosamente');
        } else {
            console.error('[useDocumentoPrecioNacional] - No hay URL de documento disponible');
            showErrorAlertMessage('No hay documento disponible para descargar');
        }
    }, [documentoData]);

    /**
     * Abre el documento en una nueva pestaña
     */
    const abrirDocumento = useCallback(() => {
        if (documentoData.url_documento) {
            console.log('[useDocumentoPrecioNacional] - Abriendo documento:', documentoData.url_documento);
            window.open(documentoData.url_documento, '_blank');
        } else {
            console.error('[useDocumentoPrecioNacional] - No hay URL de documento disponible');
            showErrorAlertMessage('No hay documento disponible para abrir');
        }
    }, [documentoData]);

    /**
     * Limpia los datos del documento
     */
    const clearDocumento = useCallback(() => {
        setDocumentoData({
            success: false,
            id_documento: 0,
            url_documento: '',
            fecha_generacion: null,
            total_recaudadores: 0,
            periodo: '',
            detail: ''
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
        generarDocumento,
        descargarDocumento,
        abrirDocumento,
        clearDocumento,
        clearAlerts,
        showSuccessAlert,
        showErrorAlertMessage
    };
}; 