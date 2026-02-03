import axios from 'axios';
import { InformacionSolicitudRecaudadorResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/recaudador/models/informacionSolicitud.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getInformacionSolicitudRecaudador = async (
    token: string,
    id: number | string
): Promise<InformacionSolicitudRecaudadorResponse> => {
    try {
        const response = await axios.get<InformacionSolicitudRecaudadorResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion-recaudador/obtener-informacion-solicitud/${id}/`,
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
            throw new Error(error.response?.data?.detail || 'Error al obtener información de la solicitud');
        }
        throw new Error('Error al obtener información de la solicitud');
    }
}; 