import axios from 'axios';
import { FacturaZipPayload, FacturaZipResponse } from '../models/factura-zip.model';

const baseApiUrl = process.env.BASE_API_URL;

export const generateFacturaZip = async (
    token: string,
    payload: FacturaZipPayload
): Promise<FacturaZipResponse> => {
    try {
        const response = await axios.post(
            `${baseApiUrl}recaudos/factura-unica/zip/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al generar el ZIP');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en generateFacturaZip:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al generar el ZIP');
        }
        throw new Error('Error inesperado al generar el ZIP');
    }
};

