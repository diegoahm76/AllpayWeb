import { useState } from 'react';
import { AprobacionPlanPagoRequest, AprobacionPlanPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/AprobacionPPRecaudador.model';
import { aprobacionPlanPagoRecaudadorAdapter } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/adapters/aprobacionPPRecaudador.adapter';

export const useAprobacionPlanPago = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AprobacionPlanPagoResponse | null>(null);

    const aprobarPlanPago = async (id: string, token: string, requestData: AprobacionPlanPagoRequest) => {
        try {
            setLoading(true);
            setError(null);

            const response = await aprobacionPlanPagoRecaudadorAdapter(id, token, requestData);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        data,
        aprobarPlanPago
    };
}; 