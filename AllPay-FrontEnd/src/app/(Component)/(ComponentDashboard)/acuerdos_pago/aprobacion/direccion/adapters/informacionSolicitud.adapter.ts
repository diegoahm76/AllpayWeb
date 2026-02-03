import axios from 'axios';
import { InformacionSolicitudDireccionResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/direccion/models/informacionSolicitud.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getInformacionSolicitudDireccion = async (
    token: string,
    id: number | string
): Promise<InformacionSolicitudDireccionResponse> => {
    try {
        const response = await axios.get<InformacionSolicitudDireccionResponse>(
            `${baseApiUrl}recaudos/acuerdos-pago/aprobacion/direccion/obtener-informacion-solicitud/${id}/`,
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