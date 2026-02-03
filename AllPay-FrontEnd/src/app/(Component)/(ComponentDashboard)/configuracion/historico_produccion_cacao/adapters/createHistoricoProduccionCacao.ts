import axios from 'axios';
import { CreateHistoricoProduccionCacaoResponse, CreateHistoricoProduccionCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/configuracion/historico_produccion_cacao/models/createHistoricoProduccionCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const createHistoricoProduccionCacao = async (
    token: string, 
    payload: CreateHistoricoProduccionCacaoPayload
): Promise<CreateHistoricoProduccionCacaoResponse> => {
    try {
        const response = await axios.post(
            `${baseApiUrl}reportes/api/produccion-cacao/`, 
            payload, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error al crear el histórico de producción de cacao:', error);
        throw error;
    }
};
