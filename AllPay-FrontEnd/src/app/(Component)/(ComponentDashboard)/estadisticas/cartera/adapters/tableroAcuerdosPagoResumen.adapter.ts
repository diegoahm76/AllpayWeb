import axios from 'axios';
import { 
    TableroAcuerdosPagoResumenResponse, 
    TableroAcuerdosPagoResumenParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroAcuerdosPagoResumen.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroAcuerdosPagoResumen = async (
    token: string,
    params: TableroAcuerdosPagoResumenParams
): Promise<TableroAcuerdosPagoResumenResponse> => {
    try {
        const queryParams = {
            ...(params.fecha_inicio && { fecha_inicio: params.fecha_inicio }),
            ...(params.fecha_fin && { fecha_fin: params.fecha_fin }),
            ...(params.numero_documento && { numero_documento: params.numero_documento })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-acuerdos-pago-resumen/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el resumen del tablero de acuerdos de pago');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroAcuerdosPagoResumen:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener el resumen del tablero de acuerdos de pago');
        }
        throw new Error('Error inesperado al obtener el resumen del tablero de acuerdos de pago');
    }
};
