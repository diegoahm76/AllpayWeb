import { useState, useCallback } from 'react';
import { getPlanPagoPorSolicitud, PlanPagoPorSolicitudFilters } from '../adapters/planPagoPorSolicitud.adapter';
import { PlanPagoPorSolicitudResponse } from '../models/planPagoPorSolicitud.model';

export const usePlanPagoPorSolicitud = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PlanPagoPorSolicitudResponse | null>(null);

    const fetchPlanPagoPorSolicitud = useCallback(async (
        token: string,
        id: number | string,
        filters: PlanPagoPorSolicitudFilters = {}
    ) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPlanPagoPorSolicitud(token, id, filters);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener los planes de pago por solicitud';
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
        fetchPlanPagoPorSolicitud
    };
}; 