import axios from 'axios';
import { LiquidacionDocumentoInternoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/liquidacion/detalles/models/interno/liquidacionDocumentoInterno.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getLiquidacionDocumentoExterno = async (
    token: string,
    idsCuotasAcuerdoPago: number[]
): Promise<LiquidacionDocumentoInternoResponse> => {
    try {

        const response = await axios.get<LiquidacionDocumentoInternoResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/liquidacion-documento/`,
            {
                params: {
                    id_cuotas: JSON.stringify(idsCuotasAcuerdoPago)
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('❌ Error en liquidación:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al generar liquidación de documento interno');
        }
        throw new Error('Error al generar liquidación de documento externo');
    }
}; 