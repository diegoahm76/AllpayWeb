import { useState } from 'react';
import { getInformacionSolicitudDireccion } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/adapters/informacionSolicitud.adapter';
import { InformacionSolicitudDireccionResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/models/informacionSolicitud.model';

export const useInformacionSolicitudDireccion = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InformacionSolicitudDireccionResponse | null>(null);

    const obtenerInformacionSolicitud = async (token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getInformacionSolicitudDireccion(token, id);
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

    const clearError = () => {
        setError(null);
    };

    const clearData = () => {
        setData(null);
    };

    return {
        loading,
        error,
        data,
        obtenerInformacionSolicitud,
        clearError,
        clearData
    };
}; 