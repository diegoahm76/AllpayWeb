import axios from 'axios';
import { 
    TableroDeudoresPorRecaudadorResponse, 
    TableroDeudoresPorRecaudadorParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroDeudoresPorRecaudador.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroDeudoresPorRecaudador = async (
    token: string,
    params: TableroDeudoresPorRecaudadorParams
): Promise<TableroDeudoresPorRecaudadorResponse> => {
    try {
        const queryParams = {
            ...(params.fecha_inicio && { fecha_inicio: params.fecha_inicio }),
            ...(params.fecha_fin && { fecha_fin: params.fecha_fin }),
            ...(params.numero_documento && { numero_documento: params.numero_documento })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-deudores-por-recaudador/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el tablero de deudores por recaudador');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroDeudoresPorRecaudador:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener el tablero de deudores por recaudador');
        }
        throw new Error('Error inesperado al obtener el tablero de deudores por recaudador');
    }
};
