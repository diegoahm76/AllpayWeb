import axios from 'axios';
import { 
    TRMCreatePayload, 
    TRMCreateResponse 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/trm.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Crea un nuevo registro de TRM
 * @param token Token de autenticación JWT
 * @param payload Datos del registro a crear
 * @returns Promise con la respuesta de creación
 */
export const crearTRM = async (
    token: string,
    payload: TRMCreatePayload
): Promise<TRMCreateResponse> => {
    try {
        // Validaciones básicas
        if (!payload.fecha_registro) {
            throw new Error('La fecha de registro es requerida');
        }

        if (!payload.precio_trm || payload.precio_trm <= 0) {
            throw new Error('El precio TRM es requerido y debe ser mayor a 0');
        }

        const url = `${baseApiUrl}reportes/api/trm/`;

        const response = await axios.post<TRMCreateResponse>(
            url,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[crearTRM] - Respuesta sin éxito:', response.data);
            throw new Error(response.data.message || 'Error en la respuesta del servidor');
        }

        return response.data;

    } catch (error) {
        console.error('[crearTRM] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[crearTRM] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Datos inválidos para la creación');
            }
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para crear registros');
            }
            if (error.response?.status === 409) {
                // Conflicto - fecha duplicada
                const errorData = error.response?.data;
                if (errorData?.error_code === 'FECHA_DUPLICADA') {
                    throw new Error(`Ya existe un registro para la fecha ${errorData.fecha_existente}. ID del registro existente: ${errorData.registro_existente_id}`);
                }
                throw new Error(errorData?.message || 'Conflicto: Ya existe un registro para esta fecha');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.message || 'Error al crear el registro de TRM');
        }
        
        throw new Error('Error de conexión al crear el registro de TRM');
    }
};
