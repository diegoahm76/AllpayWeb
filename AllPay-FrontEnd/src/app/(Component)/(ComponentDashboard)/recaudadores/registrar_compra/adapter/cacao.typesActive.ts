import axios from 'axios';

export interface TipoCacao {
    id_tipo_cacao: number;
    nombre: string;
    activo: boolean;
    item_ya_usado: boolean;
    fecha_creacion: string;
    id_persona_crea: number;
}

export interface TiposCacaoResponse {
    success: boolean;
    detail: string;
    data: TipoCacao[];
}

const baseApiUrl = process.env.BASE_API_URL;

export const getTiposCacaoActivos = async (token: string): Promise<TiposCacaoResponse> => {
    try {
        const response = await axios.get<TiposCacaoResponse>(
            `${baseApiUrl}recaudos/tipos-cacao-activo/`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error al obtener tipos de cacao activos:', error);
        throw error;
    }
};
