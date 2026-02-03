import axios from 'axios';
import { SolicitudesAprobacionResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/solicitudesAprobacion.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface SolicitudesAprobacionFilters {
    page?: number;
    page_size?: number;
    estado?: string;
    nro_solicitud?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    id_persona_solicita?: string;
}

export const getSolicitudesAprobacionRecaudador = async (
    token: string,
    filters: SolicitudesAprobacionFilters = {}
): Promise<SolicitudesAprobacionResponse> => {
    try {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', String(filters.page));
        if (filters.page_size) params.append('page_size', String(filters.page_size));
        if (filters.estado) params.append('estado', filters.estado);
        if (filters.nro_solicitud) params.append('nro_solicitud', filters.nro_solicitud);
        if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
        if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
        if (filters.id_persona_solicita) params.append('id_persona_solicita', filters.id_persona_solicita);

        const response = await axios.get<SolicitudesAprobacionResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion-recaudador/obtener-solcitiudes-aprobacion/?${params.toString()}`,
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
            throw new Error(error.response?.data?.detail || 'Error al consultar solicitudes de aprobación');
        }
        throw new Error('Error al consultar solicitudes de aprobación');
    }
}; 