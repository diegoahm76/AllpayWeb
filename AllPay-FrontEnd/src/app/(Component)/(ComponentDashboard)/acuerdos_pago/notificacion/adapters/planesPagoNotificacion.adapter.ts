import axios from 'axios';
import { PlanesPagoNotificacionResponse } from '../models/planesPagoNotificacion.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface PlanesPagoNotificacionFilters {
    page?: number;
    page_size?: number;
    estado?: string;
    nro_solicitud?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    id_persona_solicita?: string;
}

export const obtenerPlanesPagoNotificacion = async (
    token: string,
    filters?: PlanesPagoNotificacionFilters
): Promise<PlanesPagoNotificacionResponse> => {
    try {
        const response = await axios.get<PlanesPagoNotificacionResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/notificacion/obtener-planes-pago-notificacion/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                params: filters
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener los planes de pago para notificación');
        }
        throw new Error('Error al obtener los planes de pago para notificación');
    }
}; 