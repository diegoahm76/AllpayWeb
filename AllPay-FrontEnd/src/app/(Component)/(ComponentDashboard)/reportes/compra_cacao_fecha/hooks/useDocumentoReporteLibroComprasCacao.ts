import { useState, useCallback } from 'react';
import {
    DocumentoReporteLibroComprasCacaoResponse,
    DocumentoReporteLibroComprasCacaoParams,
    DocumentoReporteLibroComprasCacaoData
} from '../models/documentoReporteLibroComprasCacao.model';
import { generarDocumentoReporteLibroComprasCacao } from '../adapters/documentoReporteLibroComprasCacao.adapter';

const cleanParams = (params: DocumentoReporteLibroComprasCacaoParams): DocumentoReporteLibroComprasCacaoParams =>
    Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
    ) as DocumentoReporteLibroComprasCacaoParams;

interface UseDocumentoReporteLibroComprasCacaoReturn {
    documentoGenerado: DocumentoReporteLibroComprasCacaoData | null;
    isLoading: boolean;
    error: string | null;
    success: boolean;
    successMessage: string | null;
    generarDocumento: (token: string, params?: DocumentoReporteLibroComprasCacaoParams) => Promise<DocumentoReporteLibroComprasCacaoResponse>;
    clearDocumento: () => void;
    clearError: () => void;
    clearSuccess: () => void;
}

const useDocumentoReporteLibroComprasCacao = (): UseDocumentoReporteLibroComprasCacaoReturn => {
    const [documentoGenerado, setDocumentoGenerado] = useState<DocumentoReporteLibroComprasCacaoData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const generarDocumento = useCallback(
        async (token: string, params?: DocumentoReporteLibroComprasCacaoParams): Promise<DocumentoReporteLibroComprasCacaoResponse> => {
            try {
                setIsLoading(true);
                setError(null);
                setSuccess(false);
                setSuccessMessage(null);

                // Limpia los valores vacíos o undefined
                const cleanedParams = params ? cleanParams(params) : {};

                const response = await generarDocumentoReporteLibroComprasCacao(token, cleanedParams);

                // Actualiza el estado con los datos devueltos
                setDocumentoGenerado(response.data);
                setSuccess(true);
                setSuccessMessage(response.detail);

                return response;
            } catch (err) {
                // Manejo de error
                const errorMessage = err instanceof Error ? err.message : 'Error al generar el documento del reporte consolidado de libro de compras de cacao';
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

export default useDocumentoReporteLibroComprasCacao; 