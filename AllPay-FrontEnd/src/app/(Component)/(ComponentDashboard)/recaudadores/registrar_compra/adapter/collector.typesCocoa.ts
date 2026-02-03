import axios from 'axios';
import { TipoCacao, TiposCacaoResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/registrar_compra/models/typeCacao';

const baseApiUrl = process.env.BASE_API_URL;

export const getTiposCacao = async (token: string): Promise<TiposCacaoResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}recaudos/tipos-cacao-activo/`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error al obtener tipos de cacao:', error);
        throw error;
    }
};

export const getTiposCacaoActivos = async (token: string): Promise<TipoCacao[]> => {
    const response = await getTiposCacao(token);
    return response.data.filter(tipo => tipo.activo);
};

export const formatTiposCacaoForSelect = (tipos: TipoCacao[]) => {
    return tipos.map(tipo => ({
        key: tipo.id_tipo_cacao,
        value: tipo.id_tipo_cacao.toString(),
        title: tipo.nombre
    }));
};
