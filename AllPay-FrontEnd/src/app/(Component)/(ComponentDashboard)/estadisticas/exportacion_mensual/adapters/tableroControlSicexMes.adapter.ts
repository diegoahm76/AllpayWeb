import axios from 'axios';
import { 
    TableroControlSicexMesResponse, 
    TableroControlSicexMesParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_mensual/models/tableroControlSicexMes.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroControlSicexMes = async (
    token: string,
    params: TableroControlSicexMesParams
): Promise<TableroControlSicexMesResponse> => {
    try {
        const queryParams = {
            fecha_inicio: params.fecha_inicio,
            fecha_fin: params.fecha_fin,
            tipo_cargue: params.tipo_cargue,
            ...(params.posicion && { posicion: params.posicion }),
            ...(params.aduana_embarque && { aduana_embarque: params.aduana_embarque }),
            ...(params.continente && { continente: params.continente }),
            ...(params.via && { via: params.via }),
            ...(params.pais && { pais: params.pais }),
            ...(params.empresa && { empresa: params.empresa }),
            ...(params.comparativo_agno && { comparativo_agno: params.comparativo_agno })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-control-sicex-mes/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los datos del tablero de control mensual');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroControlSicexMes:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los datos del tablero de control mensual');
        }
        throw new Error('Error inesperado al obtener los datos del tablero de control mensual');
    }
}; 