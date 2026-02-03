import axios from 'axios';
import { 
    BolsaNYUpdatePayload, 
    BolsaNYUpdateResponse 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/bolsaNY.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Actualiza un registro de la bolsa de Nueva York existente
 * @param token Token de autenticación JWT
 * @param id ID del registro a actualizar
 * @param payload Datos del registro a actualizar
 * @returns Promise con la respuesta de actualización
 */
export const actualizarBolsaNY = async (
    token: string,
    id: number,
    payload: BolsaNYUpdatePayload
): Promise<BolsaNYUpdateResponse> => {
    try {

        if (!payload.precio_cierre || payload.precio_cierre <= 0) {
            throw new Error('El precio de cierre es requerido y debe ser mayor a 0');
        }


        if (!payload.fecha_registro) {
            throw new Error('La fecha de registro es requerida');
        }

        const url = `${baseApiUrl}reportes/api/bolsa-ny/${id}/`;

        const response = await axios.patch<BolsaNYUpdateResponse>(
            url,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },

            }
        );

        return response.data;

    } catch (error) {
        console.error('[actualizarBolsaNY] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[actualizarBolsaNY] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.detail || 'Datos inválidos para la actualización');
            }
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para editar este registro');
            }
            if (error.response?.status === 404) {
                throw new Error('Registro de bolsa de Nueva York no encontrado');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.detail || 'Error al actualizar el registro de la bolsa de Nueva York');
        }
        
        throw new Error('Error de conexión al actualizar el registro de la bolsa de Nueva York');
    }
};
