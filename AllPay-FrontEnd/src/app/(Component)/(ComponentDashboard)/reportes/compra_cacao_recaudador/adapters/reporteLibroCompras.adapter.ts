import axios from 'axios';
import {
    ReporteLibroComprasResponse,
    ReporteLibroComprasParams
} from '@/app/(Component)/(ComponentDashboard)/reportes/compra_cacao_recaudador/models/reporteLibroCompras.model';

const baseApiUrl = process.env.BASE_API_URL;

// Helper para limpiar parámetros vacíos o undefined
const cleanParams = (params: ReporteLibroComprasParams): Record<string, string> => {
    const cleanedParams: Record<string, string> = {};
    
    // page es obligatorio (a menos que sin_paginacion sea true)
    if (!params.sin_paginacion) {
        cleanedParams.page = params.page.toString();
    }
    
    // Agregar parámetros opcionales solo si tienen valor
    if (params.page_size && !params.sin_paginacion) cleanedParams.page_size = params.page_size.toString();
    if (params.id_recaudador) cleanedParams.id_recaudador = params.id_recaudador.toString();
    if (params.fecha_inicio) cleanedParams.fecha_inicio = params.fecha_inicio;
    if (params.fecha_final) cleanedParams.fecha_final = params.fecha_final;
    if (params.sin_paginacion) cleanedParams.sin_paginacion = 'true';
    
    return cleanedParams;
};

export const obtenerReporteLibroCompras = async (
    params: ReporteLibroComprasParams,
    token: string
): Promise<ReporteLibroComprasResponse> => {
    try {
        // Limpia los parámetros antes de enviarlos
        const cleanedParams = cleanParams(params);
        
        const response = await axios.get(`${baseApiUrl}reportes/reporte-libro-compras/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: cleanedParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el reporte de libro de compras');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerReporteLibroCompras:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener el reporte de libro de compras');
        }
        throw new Error('Error inesperado al obtener el reporte de libro de compras');
    }
}; 