import { useState, useEffect, useCallback } from 'react';
import { getDocumentoPlanesPagoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/adapters/externo/documentoPlanesPagoExterno.adapter';
import { DocumentoPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/models/extrerno/documentoPlanesPagoExterno.model';
import { getDocumentoPlanesPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/adapters/interno/documentoPlanesPagoInterno.adapter';

export const useDocumentoPlanesPago = (token: string, id: number | string | null, isInternalUser: boolean = false) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DocumentoPlanesPagoResponse | null>(null);

    const fetchDocumentoPlanesPago = useCallback(async () => {
        if (!token || !id) {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = isInternalUser 
            ? await getDocumentoPlanesPagoInterno(token, id) 
            : await getDocumentoPlanesPagoExterno(token, id);
            
            setData(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al obtener documento de planes de pago');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        fetchDocumentoPlanesPago();
    }, [fetchDocumentoPlanesPago]);

    return {
        loading,
        error,
        data,
        refetch: fetchDocumentoPlanesPago
    };
}; 