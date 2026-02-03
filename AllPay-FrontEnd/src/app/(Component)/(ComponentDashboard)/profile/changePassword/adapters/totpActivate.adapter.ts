import axios from 'axios';
import { 
    TotpActivatePayload,
    TotpActivateResponse
} from '../models/totpActivate.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Activa el método TOTP para autenticación de dos factores
 * @param token Token de autenticación JWT
 * @param payload Payload con el código TOTP
 * @returns Promise con la respuesta que incluye success y detail
 */
export const activarTotp = async (
    token: string,
    payload: TotpActivatePayload
): Promise<TotpActivateResponse> => {
    try {
        const response = await axios.put<TotpActivateResponse>(
            `${baseApiUrl}users/segundo-facto-autenticacion/totp/activar/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al activar el método TOTP');
        }

        return response.data;
    } catch (error) {
        console.error('[activarTotp] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[activarTotp] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para activar el método TOTP');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.detail || 'Error al activar el método TOTP');
        }
        
        throw new Error('Error inesperado al activar el método TOTP');
    }
};

