import { useState } from 'react';
import { getDetalleAcuerdoPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/detalleAcuerdoPagoInterno.adapter';
import { getDetalleAcuerdoPagoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/detalleAcuerdoPagoExterno.adapter';
import { DetalleAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/detalleAcuerdoPago.model';

export const useConsultaDetallesPlanesPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DetalleAcuerdoPagoResponse | null>(null);

    const getDetallesPlanesPago = async (token: string, id: string | number, isInternalUser: boolean | null) => {
        try {
            setLoading(true);
            setError(null);
            const response = isInternalUser ? await getDetalleAcuerdoPagoInterno(token, id) : await getDetalleAcuerdoPagoExterno(token, id); 
            setData(response);
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al consultar los detalles del plan de pago';
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
        getDetallesPlanesPago
    };
}; 