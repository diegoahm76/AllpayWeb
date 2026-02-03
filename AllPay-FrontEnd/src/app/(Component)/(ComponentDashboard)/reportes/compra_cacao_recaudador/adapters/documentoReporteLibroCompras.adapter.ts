import axios from 'axios';
import {
    DocumentoReporteLibroComprasResponse,
    DocumentoReporteLibroComprasParams
} from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/models/documentoReporteLibroCompras.model';

const baseApiUrl = process.env.BASE_API_URL;

// Helper para limpiar parámetros vacíos o undefined
const cleanParams = (params: DocumentoReporteLibroComprasParams): Record<string, string> => {
    const cleanedParams: Record<string, string> = {};
    
    // Agregar parámetros opcionales solo si tienen valor
    if (params.id_recaudador) cleanedParams.id_recaudador = params.id_recaudador.toString();
    if (params.fecha_inicio) cleanedParams.fecha_inicio = params.fecha_inicio;
    if (params.fecha_final) cleanedParams.fecha_final = params.fecha_final;
    if (params.page_size) cleanedParams.page_size = params.page_size.toString();
    
    return cleanedParams;
};

export const generarDocumentoReporteLibroCompras = async (
    params: DocumentoReporteLibroComprasParams,
    token: string
): Promise<DocumentoReporteLibroComprasResponse> => {
    try {
        // Limpia los parámetros antes de enviarlos
        const cleanedParams = cleanParams(params);
        
        const response = await axios.get(`${baseApiUrl}reportes/documento-reporte-libro-compras/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: cleanedParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el documento del reporte de libro de compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en generarDocumentoReporteLibroCompras:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al generar el documento del reporte de libro de compras');
        }
        throw new Error('Error inesperado al generar el documento del reporte de libro de compras');
    }
}; 