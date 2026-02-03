import axios from 'axios';
import { 
    ReportePrecioNacionalResponse, 
    ReportePrecioNacionalMapped,
    ReportePrecioNacionalParams 
} from '../models/reportePrecioNacional.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte de precio nacional de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros
 * @returns Promise con la respuesta del reporte
 */
export const getReportePrecioNacional = async (
    token: string,
    params: ReportePrecioNacionalParams
): Promise<ReportePrecioNacionalMapped> => {
    try {
        console.log('[getReportePrecioNacional] - Iniciando petición a la API...');
        console.log('[getReportePrecioNacional] - URL:', `${baseApiUrl}reportes/reporte-precio-nacional-cacao/`);
        console.log('[getReportePrecioNacional] - Parámetros:', params);
        console.log('[getReportePrecioNacional] - Token presente:', !!token);

        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;
        if (params.departamento) queryParams.departamento = params.departamento;
        if (params.municipio) queryParams.municipio = params.municipio;

        const response = await axios.get<ReportePrecioNacionalResponse>(
            `${baseApiUrl}reportes/reporte-precio-nacional-cacao/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[getReportePrecioNacional] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page
        });

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getReportePrecioNacional] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error('Error al obtener el reporte de precio nacional');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !response.data.data.data) {
            console.error('[getReportePrecioNacional] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        console.log('[getReportePrecioNacional] - Cantidad de recaudadores recibidos:', response.data.data.data.recaudadores?.length || 0);

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: ReportePrecioNacionalMapped = {
            success: response.data.success,
            recaudadores: response.data.data.data.recaudadores || [],
            totales: response.data.data.data.totales || {
                total_kilos: 0,
                total_valor_cuota_fomento: 0,
                precio_promedio_total: 0
            },
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            next: response.data.next,
            previous: response.data.previous
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getReportePrecioNacional] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error(error.response?.data?.detail || 'Error en la petición');
            }
        }
        
        throw error;
    }
}; 