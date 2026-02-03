import axios from 'axios';
import { UpdateTypeCacaoResponse, UpdateTypeCacaoPayload } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/updateTypeCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const updateTypeCacao = async (token: string, id: number, payload: UpdateTypeCacaoPayload): Promise<UpdateTypeCacaoResponse> => {
    try {
        const response = await axios.patch(`${baseApiUrl}recaudos/tipos-cacao/${id}/`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al actualizar tipo de cacao:', error);
        throw error;
    }
}; 