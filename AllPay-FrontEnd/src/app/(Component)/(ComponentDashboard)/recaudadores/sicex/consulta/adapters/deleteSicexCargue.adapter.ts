import axios from 'axios';
import { DeleteSicexCargueResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/sicex/consulta/models/deleteSicexCargue.model';

const baseApiUrl = process.env.BASE_API_URL;

export const deleteSicexCargue = async (
    token: string,
    consecutivo: number
): Promise<DeleteSicexCargueResponse> => {
    try {
        const response = await axios.delete(
            `${baseApiUrl}cartera/sicex-cargue/delete/${consecutivo}/`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.detail || 'Error al eliminar el cargue de SICEX'
            );
        }
        throw new Error('Error al eliminar el cargue de SICEX');
    }
};

