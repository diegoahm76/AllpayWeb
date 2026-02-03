import axios from 'axios';
import {
    DocumentoReporteLibroComprasCacaoResponse,
    DocumentoReporteLibroComprasCacaoParams
} from '../models/documentoReporteLibroComprasCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera un documento PDF del reporte consolidado de libro de compras de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros opcionales para filtrar el documento
 * @returns Promise con la respuesta del documento generado
 */
export const generarDocumentoReporteLibroComprasCacao = async (
    token: string,
    params: DocumentoReporteLibroComprasCacaoParams
): Promise<DocumentoReporteLibroComprasCacaoResponse> => {
    try {
        console.log('[generarDocumentoReporteLibroComprasCacao] - Iniciando generación de documento...');
        console.log('[generarDocumentoReporteLibroComprasCacao] - URL:', `${baseApiUrl}reportes/documento-reporte-consolidado-libro-compras-cacao/`);
        console.log('[generarDocumentoReporteLibroComprasCacao] - Parámetros:', params);
        console.log('[generarDocumentoReporteLibroComprasCacao] - Token presente:', !!token);
       
        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;
        if (params.page_size) queryParams.page_size = params.page_size;

        const response = await axios.get<DocumentoReporteLibroComprasCacaoResponse>(
            `${baseApiUrl}reportes/documento-reporte-consolidado-libro-compras-cacao/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[generarDocumentoReporteLibroComprasCacao] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            detail: response.data.detail,
            idDocumentoGenerado: response.data.data?.id_documento_generado
        });

        // Verificar si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el documento del reporte consolidado de libro de compras de cacao');
        }

        return response.data;

    } catch (error) {
        console.error('[generarDocumentoReporteLibroComprasCacao] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               'Error al generar el documento del reporte consolidado de libro de compras de cacao';
            throw new Error(errorMessage);
        }
        
        throw new Error('Error inesperado al generar el documento del reporte consolidado de libro de compras de cacao');
    }
}; 