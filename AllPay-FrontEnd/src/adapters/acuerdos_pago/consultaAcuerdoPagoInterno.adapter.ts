import axios from 'axios';
import { ConsultaAcuerdoPagoInternoResponse } from '@/domain/models/acuerdos_pago/consultaAcuerdoPagoInterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface ConsultaAcuerdoPagoInternoFilters {
    page?: number;
    page_size?: number;
    estado?: string;
    nro_solicitud?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    numero_documento?: string;
}

export const getConsultaAcuerdoPagoInterno = async (
    token: string,
    filters: ConsultaAcuerdoPagoInternoFilters = {}
): Promise<ConsultaAcuerdoPagoInternoResponse> => {
    try {
        const params: any = {};
        if (filters.page) params.page = filters.page;
        if (filters.page_size) params.page_size = filters.page_size;
        if (filters.estado) params.estado = filters.estado;
        if (filters.nro_solicitud) params.nro_solicitud = filters.nro_solicitud;
        if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
        if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
        if (filters.numero_documento) params.numero_documento = filters.numero_documento;

        const response = await axios.get(
            `${baseApiUrl}recaudos/acuerdos-pago/interno/consulta-acuerdo-pago/`,
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
            throw new Error(error.response?.data?.detail || 'Error al consultar acuerdos de pago interno');
        }
        throw new Error('Error al consultar acuerdos de pago interno');
    }
}; 