import axios from 'axios';
import { 
    TableroCarteraPorEdadResponse, 
    TableroCarteraPorEdadParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/cartera/models/tableroCarteraPorEdad.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroCarteraPorEdad = async (
    token: string,
    params: TableroCarteraPorEdadParams
): Promise<TableroCarteraPorEdadResponse> => {
    try {
        const queryParams = {
            ...(params.fecha_inicio && { fecha_inicio: params.fecha_inicio }),
            ...(params.fecha_fin && { fecha_fin: params.fecha_fin }),
            ...(params.numero_documento && { numero_documento: params.numero_documento })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-cartera-por-edad/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener el tablero de cartera por edad');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroCarteraPorEdad:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener el tablero de cartera por edad');
        }
        throw new Error('Error inesperado al obtener el tablero de cartera por edad');
    }
};
