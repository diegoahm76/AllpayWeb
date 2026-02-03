import { useState } from 'react';
import { getDocumentoPlanesPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/adapters/documentoPlanesPago.adapter';
import { DocumentoPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/documentoPlanesPago.model';

export const useDocumentoPlanesPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DocumentoPlanesPagoResponse | null>(null);

    const obtenerDocumentoPlanesPago = async (token: string, id: number | string) => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDocumentoPlanesPago(token, id);
            setData(response);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al obtener el documento de planes de pago';
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
        obtenerDocumentoPlanesPago
    };
}; 