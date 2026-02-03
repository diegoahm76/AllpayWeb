import { useState } from 'react';
import { createSolicitudAcuerdoPago, SolicitudAcuerdoPagoPayload } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/adapters/solicitudAcuerdoPago.adapter';
import { SolicitudAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/solicitudAcuerdoPago.model';

export const useSolicitudAcuerdoPago = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SolicitudAcuerdoPagoResponse | null>(null);

    const create = async (payload: SolicitudAcuerdoPagoPayload) => {
        if (!token) {
            setError('No hay token de autenticación');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await createSolicitudAcuerdoPago(token, payload);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al crear la solicitud de acuerdo de pago';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        data,
        create
    };
}; 