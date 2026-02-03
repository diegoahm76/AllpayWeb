import axios from 'axios';
import { PlanPagoPorSolicitudResponse } from '../models/planPagoPorSolicitud.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface PlanPagoPorSolicitudFilters {
    page?: number;
    page_size?: number;
}

export const getPlanPagoPorSolicitud = async (
    token: string,
    id: number | string,
    filters: PlanPagoPorSolicitudFilters = {}
): Promise<PlanPagoPorSolicitudResponse> => {
    try {
        const params: any = {};
        if (filters.page) params.page = filters.page;
        if (filters.page_size) params.page_size = filters.page_size;

        const response = await axios.get<PlanPagoPorSolicitudResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/obtener-plan-acuerdo-pago-por-solicitud/${id}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                params
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener los planes de pago por solicitud');
        }
        throw new Error('Error al obtener los planes de pago por solicitud');
    }
}; 