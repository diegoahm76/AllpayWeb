import axios from 'axios';
import { 
    TotpGeneratePayload,
    TotpGenerateResponse
} from '../models/totp.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera un código QR TOTP para autenticación de dos factores
 * @param token Token de autenticación JWT
 * @param payload Payload con el id_2fa
 * @returns Promise con la respuesta que incluye el secret, qr_base64 y otpauth_url
 */
export const generarTotp = async (
    token: string,
    payload: TotpGeneratePayload
): Promise<TotpGenerateResponse> => {
    try {
        const response = await axios.post<TotpGenerateResponse>(
            `${baseApiUrl}users/segundo-facto-autenticacion/totp/generar/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el código QR TOTP');
        }

        return response.data;
    } catch (error) {
        console.error('[generarTotp] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[generarTotp] - Error de Axios:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
            }
            if (error.response?.status === 403) {
                throw new Error('No tiene permisos para generar el código QR TOTP');
            }
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde');
            }
            throw new Error(error.response?.data?.detail || 'Error al generar el código QR TOTP');
        }
        
        throw new Error('Error inesperado al generar el código QR TOTP');
    }
};

