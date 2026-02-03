import axios from 'axios';
import { DeleteTypeCacaoResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/deleteTypeCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const deleteTypeCacao = async (token: string, id: number): Promise<DeleteTypeCacaoResponse> => {
    try {
        const response = await axios.delete(`${baseApiUrl}recaudos/tipos-cacao/${id}/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al eliminar tipo de cacao:', error);
        throw error;
    }
}; 