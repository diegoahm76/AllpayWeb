import axios from 'axios';
import { 
    TableroDeudoresPorUbicacionResponse, 
    TableroDeudoresPorUbicacionParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroDeudoresPorUbicacion.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroDeudoresPorUbicacion = async (
    token: string,
    params: TableroDeudoresPorUbicacionParams
): Promise<TableroDeudoresPorUbicacionResponse> => {
    try {

        const queryParams = {
            ...(params.fecha_inicio && { fecha_inicio: params.fecha_inicio }),
            ...(params.fecha_fin && { fecha_fin: params.fecha_fin }),
            ...(params.numero_documento && { numero_documento: params.numero_documento }),
        };


        const response = await axios.get(`${baseApiUrl}reportes/tablero-deudores-por-ubicacion/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });


        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el tablero de deudores por ubicación');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroDeudoresPorUbicacion:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener el tablero de deudores por ubicación');
        }
        console.error('Error inesperado:', error);
        throw new Error('Error inesperado al obtener el tablero de deudores por ubicación');
    }
};
