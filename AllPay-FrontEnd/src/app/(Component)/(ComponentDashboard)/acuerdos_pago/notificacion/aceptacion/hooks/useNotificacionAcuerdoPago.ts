import { useState } from 'react';
import { notificarPlanAcuerdo } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/adapters/notificacionAcuerdoPago.adapter';
import { NotificacionAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/notificacion/aceptacion/models/notificacionAcuerdoPago.model';

export const useNotificacionAcuerdoPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<NotificacionAcuerdoPagoResponse | null>(null);
    const [success, setSuccess] = useState(false);

    const notificarAcuerdoPago = async (
        token: string, 
        idSolicitudAcuerdoPago: number | string,
        docAcuerdoPlanPago: number
    ) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);
            
            const response = await notificarPlanAcuerdo(token, idSolicitudAcuerdoPago, docAcuerdoPlanPago);
            setData(response);
            setSuccess(true);
            
            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error al notificar el acuerdo de pago';
            setError(errorMessage);
            setSuccess(false);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    const clearSuccess = () => {
        setSuccess(false);
    };

    return {
        loading,
        error,
        data,
        success,
        notificarAcuerdoPago,
        clearError,
        clearSuccess
    };
}; 