import axios from 'axios';
import { FacturasPorCargueResponse } from '../models/facturasPorCargue.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface GetFacturasPorCargueParams {
    page?: number;
    page_size?: number;
    sin_paginacion?: boolean;
}

export const getFacturasPorCargue = async (
    token: string,
    uuidGrupoFacturas: string,
    params: GetFacturasPorCargueParams = {}
): Promise<FacturasPorCargueResponse> => {
    try {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.page_size) query.append('page_size', params.page_size.toString());
        if (params.sin_paginacion) query.append('sin_paginacion', 'true');

        const url = `${baseApiUrl}recaudos/facturas-por-cargue/${uuidGrupoFacturas}/${query.toString() ? `?${query.toString()}` : ''}`;

        const response = await axios.get<FacturasPorCargueResponse>(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const payload = response.data;

        if (!payload?.success) {
            throw new Error(payload?.detail || 'Error al obtener facturas por cargue');
        }

        return payload;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getFacturasPorCargue:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            const detail = (error.response?.data as any)?.detail || error.message;
            throw new Error(detail);
        }
        throw error as Error;
    }
};


