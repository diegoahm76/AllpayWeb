import { useState } from 'react';
import { actualizarCuota } from '../adapters/actualizarCuota.adapter';
import { ActualizarCuotaPayload, ActualizarCuotaResponse } from '../models/actualizarCuota.model';

interface UseActualizarCuotaReturn {
    actualizarCuotaPlanPago: (id: number | string, payload: ActualizarCuotaPayload) => Promise<ActualizarCuotaResponse>;
    loading: boolean;
    error: string | null;
    data: ActualizarCuotaResponse | null;
}

export const useActualizarCuota = (token: string): UseActualizarCuotaReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ActualizarCuotaResponse | null>(null);

    const actualizarCuotaPlanPago = async (
        id: number | string,
        payload: ActualizarCuotaPayload
    ): Promise<ActualizarCuotaResponse> => {
        try {
            setLoading(true);
            setError(null);
            const response = await actualizarCuota(token, id, payload);
            setData(response);
            return response;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al actualizar la cuota');
            setData(null);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        actualizarCuotaPlanPago,
        loading,
        error,
        data,
    };
}; 