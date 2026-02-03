import axios from 'axios';
import { PuertoExportacionResponse } from '../models/types';

const baseApiUrl = process.env.BASE_API_URL;

export const getAllPuertosExportacion = async (token: string): Promise<PuertoExportacionResponse> => {
    try {
      
        const response = await axios.get<PuertoExportacionResponse>(
            `${baseApiUrl}cartera/puertos-exportacion/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            console.error('La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.detail || 'Error al obtener los puertos de exportación');
        }

        // Verificar la estructura de los datos
        if (!Array.isArray(response.data.data)) {
            console.error('Los datos no son un array:', response.data);
            throw new Error('Formato de datos incorrecto');
        }


        // Asegurarse de que los datos tengan el formato correcto
        const processedData = {
            ...response.data,
            data: response.data.data.map((puerto: any) => {
                return {
                    ...puerto,
                    activo: puerto.activo === true
                };
            })
        };

        return processedData;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error detallado en la petición:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });
            throw new Error(`Error al obtener puertos de exportación: ${error.response?.data?.detail || error.message}`);
        }
        console.error('Error no relacionado con Axios:', error);
        throw error;
    }
};