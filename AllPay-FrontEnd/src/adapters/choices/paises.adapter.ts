import axios from 'axios';
import { 
    PaisesResponse, 
    PaisesMapped 
} from '@/domain/models/choices/paises.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene la lista de países disponibles
 * @param token Token de autenticación JWT
 * @returns Promise con la respuesta de países
 */
export const getPaises = async (token: string): Promise<PaisesMapped> => {
    try {


        const response = await axios.get<PaisesResponse>(
            `${baseApiUrl}personas/paises/get-list/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );


        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getPaises] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.detail || 'Error al obtener la lista de países');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !Array.isArray(response.data.data)) {
            console.error('[getPaises] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: PaisesMapped = {
            success: response.data.success,
            paises: response.data.data,
            detail: response.data.detail
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getPaises] - Error:', error);
        
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
        
        throw new Error('Error inesperado al obtener la lista de países');
    }
};
