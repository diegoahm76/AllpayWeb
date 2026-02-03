import axios from 'axios';
import { 
    TableroControlSicexResponse, 
    TableroControlSicexParams 
} from '@/app/(Component)/(ComponentDashboard)/estadisticas/exportacion_partida/models/tableroControlSicex.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerTableroControlSicex = async (
    token: string,
    params: TableroControlSicexParams
): Promise<TableroControlSicexResponse> => {
    try {
        const queryParams = {
            fecha_inicio: params.fecha_inicio,
            fecha_fin: params.fecha_fin,
            tipo_cargue: params.tipo_cargue,
            ...(params.posicion && { posicion: params.posicion }),
            ...(params.aduana_embarque && { aduana_embarque: params.aduana_embarque }),
            ...(params.continente && { continente: params.continente }),
            ...(params.via && { via: params.via }),
            ...(params.comparativo_agno && { comparativo_agno: params.comparativo_agno }),
            ...(params.pais && { pais: params.pais }),
            ...(params.empresa && { empresa: params.empresa })
        };

        const response = await axios.get(`${baseApiUrl}reportes/tablero-control-sicex/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener los datos del tablero de control');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en obtenerTableroControlSicex:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.detail || 'Error al obtener los datos del tablero de control');
        }
        throw new Error('Error inesperado al obtener los datos del tablero de control');
    }
};
