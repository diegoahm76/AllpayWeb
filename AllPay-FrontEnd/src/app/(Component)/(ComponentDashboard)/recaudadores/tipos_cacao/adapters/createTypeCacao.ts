import axios from 'axios';
import { CreateTypeCacaoResponse, CreateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/createTypeCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const createTypeCacao = async (token: string, payload: CreateTypeCacaoPayload): Promise<CreateTypeCacaoResponse> => {
    try {
        const response = await axios.post(`${baseApiUrl}recaudos/tipos-cacao/`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al crear tipo de cacao:', error);
        throw error;
    }
};