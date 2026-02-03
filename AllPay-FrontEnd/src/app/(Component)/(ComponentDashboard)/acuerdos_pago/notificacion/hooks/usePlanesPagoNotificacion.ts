import { useState } from 'react';
import { obtenerPlanesPagoNotificacion, PlanesPagoNotificacionFilters } from '../adapters/planesPagoNotificacion.adapter';
import { PlanesPagoNotificacionResponse } from '../models/planesPagoNotificacion.model';

export const usePlanesPagoNotificacion = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PlanesPagoNotificacionResponse | null>(null);

    const getPlanesPagoNotificacion = async (token: string, filters?: PlanesPagoNotificacionFilters) => {
        try {
            setLoading(true);
            setError(null);
            const response = await obtenerPlanesPagoNotificacion(token, filters);
            setData(response);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al obtener los planes de pago para notificación';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const fetchAllData = async (pageToFetch: number, token: string, filters?: PlanesPagoNotificacionFilters) => {
        const merged: PlanesPagoNotificacionFilters = {
            ...filters,
            page: pageToFetch,
            page_size: 10,
        };
        const resp = await obtenerPlanesPagoNotificacion(token, merged);
        const items = resp.data?.data ?? [];
        
        // Formatear los datos para el Excel igual que en el componente
        const formattedData = items.map((item: any) => ({
            numero_solicitud: item.nro_solicitud,
            fecha_solicitud: item.fecha_solicitud,
            estado: item.estado_display || item.estado,
            nit_recaudador: item.numero_documento,
            total_pagar: item.valor_total_pagar,
            observaciones: item.observaciones,
            fecha_aprobacion_recaudo: item.fecha_aprobacion_recaudo || '',
            fecha_aprobacion_juridica: item.fecha_aprobacion_juridica || '',
            fecha_aprobacion_direccion: item.fecha_aprobacion_direccion || ''
        }));
        
        return {
            data: formattedData,
            total_pages: resp.total_pages ?? 1
        };
    };

    return {
        loading,
        error,
        data,
        getPlanesPagoNotificacion,
        fetchAllData
    };
}; 