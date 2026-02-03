import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;
import { SolicitudesLiquidacionResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/models/extrerno/solicitudesLiquidacion.model';

export interface SolicitudesLiquidacionFilters {
    page?: number;
    page_size?: number;
    nro_solicitud?: string;
    nro_plan_pago?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
}

export const getSolicitudesLiquidacionInterno = async (
    token: string,
    filters: SolicitudesLiquidacionFilters = {}
): Promise<SolicitudesLiquidacionResponse> => {
    try {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', String(filters.page));
        if (filters.page_size) params.append('page_size', String(filters.page_size));
        if (filters.nro_solicitud) params.append('nro_solicitud', filters.nro_solicitud);
        if (filters.nro_plan_pago) params.append('nro_plan_pago', filters.nro_plan_pago);
        if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
        if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

        const response = await axios.get<SolicitudesLiquidacionResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-interno/obtener-solcitiudes/?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al consultar solicitudes de liquidación interno');
        }
        throw new Error('Error al consultar solicitudes de liquidación interno');
    }
}; 