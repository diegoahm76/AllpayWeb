import { useState } from 'react';
import { getInformacionSolicitud } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/adapters/informacionSolicitud.adapter';
import { InformacionSolicitudRecaudadorResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/informacionSolicitud.model';

export const useInformacionSolicitud = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InformacionSolicitudRecaudadorResponse | null>(null);

    const obtenerInformacionSolicitud = async (token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getInformacionSolicitud(token, id);
            setData(response);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al obtener información de la solicitud';
            setError(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        data,
        obtenerInformacionSolicitud
    };
}; 