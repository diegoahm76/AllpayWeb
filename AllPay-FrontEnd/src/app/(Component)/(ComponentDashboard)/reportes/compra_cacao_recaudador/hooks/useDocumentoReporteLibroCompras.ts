import { useState, useCallback } from 'react';
import {
    DocumentoReporteLibroComprasResponse,
    DocumentoReporteLibroComprasParams,
    DocumentoReporteLibroComprasData
} from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/models/documentoReporteLibroCompras.model';
import { generarDocumentoReporteLibroCompras } from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/adapters/documentoReporteLibroCompras.adapter';

const cleanParams = (params: DocumentoReporteLibroComprasParams): DocumentoReporteLibroComprasParams =>
    Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    ) as DocumentoReporteLibroComprasParams;

interface UseDocumentoReporteLibroComprasReturn {
    documentoGenerado: DocumentoReporteLibroComprasData | null;
    isLoading: boolean;
    error: string | null;
    success: boolean;
    successMessage: string | null;
    generarDocumento: (token: string, params?: DocumentoReporteLibroComprasParams) => Promise<DocumentoReporteLibroComprasResponse>;
    clearDocumento: () => void;
    clearError: () => void;
    clearSuccess: () => void;
}

const useDocumentoReporteLibroCompras = (): UseDocumentoReporteLibroComprasReturn => {
    const [documentoGenerado, setDocumentoGenerado] = useState<DocumentoReporteLibroComprasData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const generarDocumento = useCallback(
        async (token: string, params?: DocumentoReporteLibroComprasParams): Promise<DocumentoReporteLibroComprasResponse> => {
            try {
                setIsLoading(true);
                setError(null);
                setSuccess(false);
                setSuccessMessage(null);

                // Limpia los valores vacíos o undefined
                const cleanedParams = params ? cleanParams(params) : {};

                const response = await generarDocumentoReporteLibroCompras(cleanedParams, token);

                // Actualiza el estado con los datos devueltos
                setDocumentoGenerado(response.data);
                setSuccess(true);
                setSuccessMessage(response.detail);

                return response;
            } catch (err) {
                // Manejo de error
                const errorMessage = err instanceof Error ? err.message : 'Error al generar el documento del reporte de libro de compras';
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

export default useDocumentoReporteLibroCompras; 