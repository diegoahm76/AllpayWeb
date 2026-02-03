import { useState } from 'react';
import { getInformacionSolicitudJuridica } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/adapters/informacionSolicitud.adapter';
import { InformacionSolicitudResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/models/informacionSolicitud.model';

export const useInformacionSolicitudJuridica = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<InformacionSolicitudResponse | null>(null);

    const obtenerInformacionSolicitud = async (token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getInformacionSolicitudJuridica(token, id);
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