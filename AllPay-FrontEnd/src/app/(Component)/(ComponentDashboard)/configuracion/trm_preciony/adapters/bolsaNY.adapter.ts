import axios from 'axios';
import { 
    BolsaNYResponse, 
    BolsaNYParams 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/trm_preciony/models/bolsaNY.model';

const baseApiUrl = process.env.BASE_API_URL;

export const obtenerBolsaNY = async (
    token: string,
    params: BolsaNYParams
): Promise<BolsaNYResponse> => {
    try {

        
        const queryParams = {
            ...(params.page && { page: params.page }),
            ...(params.page_size && { page_size: params.page_size }),
        };
        

        const response = await axios.get(`${baseApiUrl}reportes/api/bolsa-ny/`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            params: queryParams
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al obtener datos de la bolsa de Nueva York');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener datos de la bolsa de Nueva York');
        }
        throw new Error('Error inesperado al obtener datos de la bolsa de Nueva York');
    }
};
