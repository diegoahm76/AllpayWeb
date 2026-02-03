import { useState, useEffect, useCallback } from 'react';
import { getDetallesPlanesPagoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/externo/detallesPlanesPagoExterno.adapter';
import { DetallesPlanesPagoResponseExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/externo/detallesPlanesPagoExterno.model';
import { getDetallesPlanesPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/adapters/interno/detallesPlanesPagoInterno.adapter';
import { DetallesPlanesPagoResponseInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/interno/detallesPlanesPagoInterno.model';

export const useDetallesPlanesPago = (token: string, id: number | string | null, isInternalUser: boolean | null) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DetallesPlanesPagoResponseExterno | DetallesPlanesPagoResponseInterno | null>(null);

    const fetchDetallesPlanesPago = useCallback(async () => {
        if (!token || !id || isInternalUser === null) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
                        
            const response = isInternalUser 
                ? await getDetallesPlanesPagoInterno(token, id) 
                : await getDetallesPlanesPagoExterno(token, id);

            setData(response);
        } catch (err) {
            console.error('❌ Error al obtener detalles:', err);
            setError(err instanceof Error ? err.message : 'Error al obtener detalles de planes de pago');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [token, id, isInternalUser]);

    useEffect(() => {
        fetchDetallesPlanesPago();
    }, [fetchDetallesPlanesPago]);

    return {
        loading,
        error,
        data,
        refetch: fetchDetallesPlanesPago
    };
}; 