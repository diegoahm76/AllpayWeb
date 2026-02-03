import axios from 'axios';
import { TypeCacaoApiResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/tipos_cacao/models/typeCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getTypesCacao = async (token: string): Promise<TypeCacaoApiResponse> => {

    try {
        const response = await axios.get(`${baseApiUrl}recaudos/tipos-cacao/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener los tipos de cacao:', error);
        throw error;
    }
}; 