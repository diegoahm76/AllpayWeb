import { useState, useCallback } from 'react';
import {
    DocumentoReporteConsolidadoPagoCuotaFomentoResponse,
    DocumentoReporteConsolidadoPagoCuotaFomentoParams,
    DocumentoReporteConsolidadoPagoCuotaFomentoData
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/models/documentoReporteConsolidadoPagoCuotaFomento.model';
import { generarDocumentoReporteConsolidadoPagoCuotaFomento } from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/adapters/documentoReporteConsolidadoPagoCuotaFomento.adapter';

const cleanParams = (params: DocumentoReporteConsolidadoPagoCuotaFomentoParams): DocumentoReporteConsolidadoPagoCuotaFomentoParams =>
    Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    ) as DocumentoReporteConsolidadoPagoCuotaFomentoParams;

interface UseDocumentoReporteConsolidadoPagoCuotaFomentoReturn {
    documentoGenerado: DocumentoReporteConsolidadoPagoCuotaFomentoData | null;
    isLoading: boolean;
    error: string | null;
    success: boolean;
    successMessage: string | null;
    generarDocumento: (token: string, params?: DocumentoReporteConsolidadoPagoCuotaFomentoParams) => Promise<DocumentoReporteConsolidadoPagoCuotaFomentoResponse>;
    clearDocumento: () => void;
    clearError: () => void;
    clearSuccess: () => void;
}

const useDocumentoReporteConsolidadoPagoCuotaFomento = (): UseDocumentoReporteConsolidadoPagoCuotaFomentoReturn => {
    const [documentoGenerado, setDocumentoGenerado] = useState<DocumentoReporteConsolidadoPagoCuotaFomentoData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const generarDocumento = useCallback(
        async (token: string, params?: DocumentoReporteConsolidadoPagoCuotaFomentoParams): Promise<DocumentoReporteConsolidadoPagoCuotaFomentoResponse> => {
            try {
                setIsLoading(true);
                setError(null);
                setSuccess(false);
                setSuccessMessage(null);

                // Limpia los valores vacíos o undefined
                const cleanedParams = params ? cleanParams(params) : {};

                const response = await generarDocumentoReporteConsolidadoPagoCuotaFomento(token, cleanedParams);

                // Actualiza el estado con los datos devueltos
                setDocumentoGenerado(response.data);
                setSuccess(true);
                setSuccessMessage(response.detail);

                return response;
            } catch (err) {
                // Manejo de error
                const errorMessage = err instanceof Error ? err.message : 'Error al generar el documento del reporte consolidado de pago de cuota de fomento';
                console.error('Error en generarDocumento:', errorMessage);
                setError(errorMessage);
                setDocumentoGenerado(null);
                setSuccess(false);
                setSuccessMessage(null);

                return {
                    success: false,
                    detail: errorMessage,
                    data: {
                        id_documento_generado: 0,
                        documento_generado: '',
                        archivo: ''
                    }
                };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const clearDocumento = useCallback(() => {
        setDocumentoGenerado(null);
        setSuccess(false);
        setSuccessMessage(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearSuccess = useCallback(() => {
        setSuccess(false);
        setSuccessMessage(null);
    }, []);

    return {
        documentoGenerado,
        isLoading,
        error,
        success,
        successMessage,
        generarDocumento,
        clearDocumento,
        clearError,
        clearSuccess
    };
};

export default useDocumentoReporteConsolidadoPagoCuotaFomento; 