import axios from 'axios';
import { 
    TiposCargueResponse, 
    TiposCargueMapped,
    TiposCargueStructuredMapped,
    TipoCargueStructured
} from '../models/tiposCargue.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene los tipos de cargue disponibles
 * @param token Token de autenticación JWT
 * @returns Promise con la respuesta de los tipos de cargue
 */
export const getTiposCargue = async (
    token: string
): Promise<TiposCargueMapped> => {
    try {

        const response = await axios.get<TiposCargueResponse>(
            `${baseApiUrl}choices/cod-tipo-cargue/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getTiposCargue] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.detail || 'Error al obtener los tipos de cargue');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !Array.isArray(response.data.data)) {
            console.error('[getTiposCargue] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: TiposCargueMapped = {
            success: response.data.success,
            tiposCargue: response.data.data
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getTiposCargue] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error(error.response?.data?.detail || 'Error en la petición');
            }
        }
        
        throw error;
    }
};

/**
 * Obtiene los tipos de cargue con estructura más clara (opcional)
 * @param token Token de autenticación JWT
 * @returns Promise con la respuesta de los tipos de cargue estructurados
 */
export const getTiposCargueStructured = async (
    token: string
): Promise<TiposCargueStructuredMapped> => {
    try {
        const response = await getTiposCargue(token);
        
        // Transformar el array de arrays a objetos estructurados
        const tiposCargueStructured: TipoCargueStructured[] = response.tiposCargue.map(
            ([codigo, descripcion]) => ({
                codigo,
                descripcion
            })
        );

        return {
            success: response.success,
            tiposCargue: tiposCargueStructured
        };

    } catch (error) {
        console.error('[getTiposCargueStructured] - Error:', error);
        throw error;
    }
}; 