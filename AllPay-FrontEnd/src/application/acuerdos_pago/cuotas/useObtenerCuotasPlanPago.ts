import { useState } from 'react';
import { obtenerCuotasPlanPago } from '@/adapters/acuerdos_pago/cuotas/obtenerCuotasPlanPago.adapter';
import { ObtenerDetallesPlanPagoResponse } from '@/domain/models/acuerdos_pago/cuotas/obtenerCuotasPlanPago.model';

interface UseObtenerDetallesPlanPagoReturn {
    obtenerDetalles: (id: number | string) => Promise<void>;
    loading: boolean;
    error: string | null;
    data: ObtenerDetallesPlanPagoResponse | null;
}

export const useObtenerDetallesPlanPago = (token: string): UseObtenerDetallesPlanPagoReturn => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ObtenerDetallesPlanPagoResponse | null>(null);

    const obtenerDetalles = async (id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await obtenerCuotasPlanPago(token, id);
            setData(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener los detalles del plan de pago');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    return {
        obtenerDetalles,
        loading,
        error,
        data,
    };
}; 