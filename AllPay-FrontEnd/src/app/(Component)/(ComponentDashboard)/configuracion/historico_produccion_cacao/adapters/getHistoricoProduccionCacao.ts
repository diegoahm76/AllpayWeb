import axios from 'axios';
import { 
    HistoricoProduccionCacaoApiResponse, 
    HistoricoProduccionCacaoFilters 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/historicoProduccionCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getHistoricoProduccionCacao = async (
    token: string, 
    filters?: HistoricoProduccionCacaoFilters
): Promise<HistoricoProduccionCacaoApiResponse> => {
    try {
        // Construir parámetros de consulta
        const params = new URLSearchParams();
        if (filters?.page) {
            params.append('page', filters.page.toString());
        }
        if (filters?.page_size) {
            params.append('page_size', filters.page_size.toString());
        }

        const queryString = params.toString();
        const url = `${baseApiUrl}reportes/api/produccion-cacao/${queryString ? `?${queryString}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error al obtener el histórico de producción de cacao:', error);
        throw error;
    }
};
