import axios from 'axios';
import { InformacionSolicitudResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/models/informacionSolicitud.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getInformacionSolicitudJuridica = async (
    token: string,
    id: number | string
): Promise<InformacionSolicitudResponse> => {
    try {
        const response = await axios.get<InformacionSolicitudResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion/juridica/obtener-informacion-solicitud/${id}/`,
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