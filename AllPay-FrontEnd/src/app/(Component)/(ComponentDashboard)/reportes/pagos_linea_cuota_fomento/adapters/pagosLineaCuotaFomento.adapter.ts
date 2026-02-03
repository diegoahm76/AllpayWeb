import axios from 'axios';
import { 
    PagosLineaCuotaFomentoResponse, 
    PagosLineaCuotaFomentoMapped,
    PagosLineaCuotaFomentoParams 
} from '../models/pagosLineaCuotaFomento.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte de pagos en línea de cuota fomento
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros
 * @returns Promise con la respuesta del reporte
 */
export const getPagosLineaCuotaFomento = async (
    token: string,
    params: PagosLineaCuotaFomentoParams
): Promise<PagosLineaCuotaFomentoMapped> => {
    try {


        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar paginación o sin_paginacion
        if (params.sin_paginacion) {
            queryParams.sin_paginacion = true;
        } else {
            queryParams.page = params.page;
            queryParams.page_size = params.page_size;
        }

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;

        const response = await axios.get<PagosLineaCuotaFomentoResponse>(
            `${baseApiUrl}reportes/reporte-pagos-en-linea/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[getPagosLineaCuotaFomento] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            pagos_length: response.data.data?.pagos?.length || 0,
            total_cuota: response.data.data?.total_cuota,
            total_interes: response.data.data?.total_interes
        });

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getPagosLineaCuotaFomento] - La API indicó que la petición no fue exitosa:', response.data);
            // Si hay un detail específico, usarlo
            if (response.data.detail) {
                throw new Error(response.data.detail);
            }
            throw new Error('Error al obtener el reporte de pagos en línea');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !response.data.data.pagos) {
            console.error('[getPagosLineaCuotaFomento] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        console.log('[getPagosLineaCuotaFomento] - Cantidad de registros recibidos:', response.data.data.pagos.length);

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: PagosLineaCuotaFomentoMapped = {
            success: response.data.success,
            registros: response.data.data.pagos || [],
            count: response.data.count || 0,
            total_pages: response.data.total_pages || 1,
            current_page: response.data.current_page || 1,
            next: response.data.next || null,
            previous: response.data.previous || null,
            total_cuota: response.data.data.total_cuota,
            total_interes: response.data.data.total_interes
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getPagosLineaCuotaFomento] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            // Si la respuesta tiene un detail, usarlo como mensaje de error
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            
            // Si no hay detail, manejar por código de estado
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error('Error en la petición');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al obtener el reporte de pagos en línea');
    }
}; 