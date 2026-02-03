import axios from 'axios';
import { 
    TableroAcuerdosPagoResponse, 
    TableroAcuerdosPagoParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroAcuerdosPago = async (
    token: string,
    params: TableroAcuerdosPagoParams
): Promise<TableroAcuerdosPagoResponse> => {
    try {
        const queryParams = {
            ...(params.fecha_inicio && { fecha_inicio: params.fecha_inicio }),
            ...(params.fecha_fin && { fecha_fin: params.fecha_fin }),
            ...(params.numero_documento && { numero_documento: params.numero_documento }),
            ...(params.nombres && { nombres: params.nombres }),
            ...(params.correo_electronico && { correo_electronico: params.correo_electronico }),
            ...(params.tipo_documento && { tipo_documento: params.tipo_documento }),
            ...(params.page && { page: params.page }),
            ...(params.page_size && { page_size: params.page_size })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-acuerdos-pago/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los datos del tablero de acuerdos de pago');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroAcuerdosPago:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los datos del tablero de acuerdos de pago');
        }
        throw new Error('Error inesperado al obtener los datos del tablero de acuerdos de pago');
    }
};
