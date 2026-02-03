import axios from 'axios';
import { 
    DepartamentoProduccionCacaoApiResponse, 
    DepartamentoProduccionCacaoFilters 
} from '@/app/(Component)/(ComponentDashboard)/configuracion/departamento_produccion_cacao/models/departamentoProduccionCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getDepartamentoProduccionCacao = async (
    token: string, 
    filters?: DepartamentoProduccionCacaoFilters
): Promise<DepartamentoProduccionCacaoApiResponse> => {
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
        const url = `${baseApiUrl}reportes/api/historico-produccion-departamento/${queryString ? `?${queryString}` : ''}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error al obtener el histórico de producción por departamento:', error);
        throw error;
    }
};
