import axios from 'axios';
import { 
    TRMResponse, 
    TRMParams 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/trm.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los datos de TRM con paginación
 * @param token Token de autenticación JWT
 * @param params Parámetros de paginación
 * @returns Promise con la respuesta de TRM
 */
export const obtenerTRM = async (
    token: string,
    params: TRMParams
): Promise<TRMResponse> => {
    try {
        const queryParams = {
            ...(params.page && { page: params.page }),
            ...(params.page_size && { page_size: params.page_size }),
        };
        
        const response = await axios.get(`${baseApiUrl}reportes/api/trm/`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener datos de TRM');
        }

        return response.data;
    } catch (error) {
        console.error('[obtenerTRM] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[obtenerTRM] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a los datos de TRM');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.detail || 'Error al obtener datos de TRM');
        }
        
        throw new Error('Error inesperado al obtener datos de TRM');
    }
};
