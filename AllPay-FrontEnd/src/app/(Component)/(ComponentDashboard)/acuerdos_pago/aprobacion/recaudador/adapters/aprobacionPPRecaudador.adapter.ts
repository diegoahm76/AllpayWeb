import axios from 'axios';
import { AprobacionPlanPagoRequest, AprobacionPlanPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/AprobacionPPRecaudador.model';

const baseApiUrl = process.env.BASE_API_URL;

export const aprobacionPlanPagoRecaudadorAdapter = async (
    id: string,
    token: string,
    data: AprobacionPlanPagoRequest
): Promise<AprobacionPlanPagoResponse> => {

    try {
        const response = await axios.patch<AprobacionPlanPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion-recaudador/aprobacion-plan-pago-recaudador/${id}/`,
            data,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al aprobar el plan de pago');
        }
        throw error;
    }
}; 