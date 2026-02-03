import axios from 'axios';
import { AprobacionPlanPagoRequest, AprobacionPlanPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/models/AprobacionPPJuridica.model';

const baseApiUrl = process.env.BASE_API_URL;

export const aprobacionPlanPagoJuridicaAdapter = async (
    id: string,
    token: string,
    data: AprobacionPlanPagoRequest
): Promise<AprobacionPlanPagoResponse> => {
    try {
          
        const response = await axios.post<AprobacionPlanPagoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion/juridica/aprobacion-plan-pago-juridica/${id}/`,
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