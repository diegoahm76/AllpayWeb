import { useState } from 'react';
import { getSolicitudAcuerdoPagoPreview } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/adapters/solicitudAcuerdoPago.adapter';
import { SolicitudAcuerdoPagoPreviewResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/solicitudAcuerdoPago.model';

export const useSolicitudAcuerdoPagoPreview = (token: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SolicitudAcuerdoPagoPreviewResponse | null>(null);

    const fetchPreview = async (id_facturas: number[]) => {
        if (!token) {
            setError('No hay token de autenticación');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const response = await getSolicitudAcuerdoPagoPreview(token, id_facturas);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al obtener la vista previa de la solicitud de acuerdo de pago';
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
        fetchPreview
    };
}; 