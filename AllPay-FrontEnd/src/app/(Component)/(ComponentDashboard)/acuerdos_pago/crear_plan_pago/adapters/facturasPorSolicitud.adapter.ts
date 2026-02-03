import axios from 'axios';
import { FacturasPorSolicitudResponse } from '../models/facturasPorSolicitud.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getFacturasPorSolicitud = async (
    token: string,
    id: number | string
): Promise<FacturasPorSolicitudResponse> => {
    try {
        const response = await axios.get<FacturasPorSolicitudResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/facturas-x-solicitud/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener las facturas por solicitud');
        }
        throw new Error('Error al obtener las facturas por solicitud');
    }
}; 