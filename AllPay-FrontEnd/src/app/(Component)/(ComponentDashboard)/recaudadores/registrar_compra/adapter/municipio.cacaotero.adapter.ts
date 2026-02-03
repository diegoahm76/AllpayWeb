import axios from 'axios';
import { MunicipioCacaoteroResponse } from '../models/municipio.cacaotero.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getMunicipiosCacaoteros = async (departamentoId: string, token: string): Promise<MunicipioCacaoteroResponse> => {

    // Formatear departamentoId para que siempre tenga 2 dígitos
    const departamentoIdFormateado = departamentoId.padStart(2, '0');
    
    try {
        const response = await axios.get(`${baseApiUrl}personas/municipio-cacaotero/get-list/${departamentoIdFormateado}/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            return {
                success: false,
                detail: response.data.detail,
                data: []
            };
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getMunicipiosCacaoteros:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener municipios cacaoteros: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener municipios cacaoteros');
    }
}; 