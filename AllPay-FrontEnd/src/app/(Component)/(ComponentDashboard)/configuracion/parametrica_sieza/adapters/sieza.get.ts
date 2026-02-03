import axios from 'axios';
import { SiezaResponse } from '../models/sieza.types';

const baseApiUrl = process.env.BASE_API_URL;

export const getSiezaData = async (token: string): Promise<SiezaResponse> => {
    try {
        const url = `${baseApiUrl}recaudos/siesa/`;
        
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const payload: SiezaResponse = response.data;

        if (payload.success === false) {
            throw new Error((payload as any).detail || 'Error al obtener los datos del sistema contable');
        }

        if (!payload.data?.success) {
            throw new Error(payload.data?.detail || 'Error al obtener los datos de si');
        }

        return payload;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getSiezaData:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                config: {
                    url: error.config?.url,
                    headers: error.config?.headers
                }
            });
            
            // Manejar diferentes tipos de errores
            if (error.response?.status === 401) {
                throw new Error('Error de autenticación: Token inválido o expirado');
            } else if (error.response?.status === 403) {
                throw new Error('Error de autorización: No tiene permisos para acceder a este recurso');
            } else if (error.response?.status && error.response.status >= 500) {
                throw new Error('Error del servidor: Intente nuevamente más tarde');
            } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
                throw new Error('Error de red: Verifique su conexión a internet');
            } else {
                throw new Error(`Error al obtener datos del sistema contable: ${error.response?.data?.detail || error.message}`);
            }
        }
        throw new Error('Error inesperado al obtener datos del sistema contable');
    }
};
