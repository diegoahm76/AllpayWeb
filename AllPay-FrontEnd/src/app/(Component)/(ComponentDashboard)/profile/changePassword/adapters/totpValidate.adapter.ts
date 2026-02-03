import axios from 'axios';
import { 
    TotpValidatePayload,
    TotpValidateResponse
} from '../models/totpValidate.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Valida un código TOTP para autenticación de dos factores
 * @param token Token de autenticación JWT
 * @param payload Payload con el código TOTP
 * @returns Promise con la respuesta que incluye success y detail
 */
export const validarTotp = async (
    token: string,
    payload: TotpValidatePayload
): Promise<TotpValidateResponse> => {
    try {
        const response = await axios.post<TotpValidateResponse>(
            `${baseApiUrl}users/segundo-facto-autenticacion/totp/validar/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al validar el código TOTP');
        }

        return response.data;
    } catch (error) {
        console.error('[validarTotp] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[validarTotp] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para validar el código TOTP');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.detail || 'Error al validar el código TOTP');
        }
        
        throw new Error('Error inesperado al validar el código TOTP');
    }
};

