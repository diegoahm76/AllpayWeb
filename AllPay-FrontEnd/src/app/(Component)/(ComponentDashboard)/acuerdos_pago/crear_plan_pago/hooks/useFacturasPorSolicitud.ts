import { useState, useCallback } from 'react';
import { getFacturasPorSolicitud } from '../adapters/facturasPorSolicitud.adapter';
import { FacturasPorSolicitudResponse } from '../models/facturasPorSolicitud.model';

export const useFacturasPorSolicitud = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<FacturasPorSolicitudResponse | null>(null);

    const fetchFacturasPorSolicitud = useCallback(async (
        token: string,
        id: number | string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getFacturasPorSolicitud(token, id);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener las facturas por solicitud';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        data,
        fetchFacturasPorSolicitud
    };
}; 