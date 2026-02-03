import axios from 'axios';
import { PercentageHistoryResponse, PercentageHistoryFilters } from '../models/percentageHistory.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getPercentageHistory = async (
    token: string,
    filters: PercentageHistoryFilters = {}
): Promise<PercentageHistoryResponse> => {
    try {
        const params = new URLSearchParams();
        
        // Agregar parámetros solo si tienen valor
        if (filters.page) params.append('page', String(filters.page));
        if (filters.page_size) params.append('page_size', String(filters.page_size));
        if (filters.cod_tipo_cobro) params.append('cod_tipo_cobro', filters.cod_tipo_cobro);

        const url = `${baseApiUrl}recaudos/historial-porcentaje-cobro/${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el historial de porcentajes de cobro');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener historial de porcentajes:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener historial de porcentajes: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}; 