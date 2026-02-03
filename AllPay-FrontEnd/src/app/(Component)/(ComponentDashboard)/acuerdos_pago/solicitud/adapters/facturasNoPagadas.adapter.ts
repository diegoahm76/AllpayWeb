import axios from 'axios';
import { FacturasNoPagadasResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/solicitud/models/facturasNoPagadas.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getFacturasNoPagadas = async (token: string, page: number = 1, pageSize: number = 10): Promise<FacturasNoPagadasResponse> => {
    try {
        const response = await axios.get<FacturasNoPagadasResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/factura-no-pagadas/?page_size=${pageSize}&page=${page}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener las facturas no pagadas');
        }
        throw new Error('Error al obtener las facturas no pagadas');
    }
}; 