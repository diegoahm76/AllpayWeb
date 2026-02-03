import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

interface TipoDocumento {
    cod_tipo_documento: string;
    nombre: string;
}

interface DniResponse {
    success: boolean;
    detail: string;
    data: TipoDocumento[];
}

export const getAllDni = async (token: string): Promise<DniResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}personas/tipos-documento/get-list/?activo=True`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al obtener los tipos de documento');
        }

        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Error al obtener los tipos de documento');
    }
};
