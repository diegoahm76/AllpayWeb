import { useState } from 'react';
import { eliminarCuotaPlanPago } from '../adapters/eliminarCuotaPlanPago.adapter';
import { EliminarCuotaPlanPagoResponse } from '../models/eliminarCuotaPlanPago.model';

interface UseEliminarCuotaPlanPagoReturn {
    eliminarCuota: (id: number | string) => Promise<EliminarCuotaPlanPagoResponse>;
    loading: boolean;
    error: string | null;
    data: EliminarCuotaPlanPagoResponse | null;
}

export const useEliminarCuotaPlanPago = (token: string): UseEliminarCuotaPlanPagoReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<EliminarCuotaPlanPagoResponse | null>(null);

    const eliminarCuota = async (id: number | string): Promise<EliminarCuotaPlanPagoResponse> => {
        try {
            setLoading(true);
            setError(null);
            const response = await eliminarCuotaPlanPago(token, id);
            setData(response);
            return response;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al eliminar la cuota');
            setData(null);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        eliminarCuota,
        loading,
        error,
        data,
    };
}; 