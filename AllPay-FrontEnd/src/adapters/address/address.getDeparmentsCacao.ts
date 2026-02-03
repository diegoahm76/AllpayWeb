import axios from 'axios';

interface Departamento {
    cod_departamento: string;
    nombre: string;
}

interface DepartamentoResponse {
    success: boolean;
    detail: string;
    data: Departamento[];
}

const baseApiUrl = process.env.BASE_API_URL;

export const getDepartamentosCacaotero = async (): Promise<DepartamentoResponse> => {
    try {
        const response = await axios.get(`${baseApiUrl}personas/departamento-cacaotero/get-list/CO/`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success === false) {
            throw response.data.detail;
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en getDepartamentosCacaotero:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al obtener departamentosCacaotero: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al obtener departamentosCacaotero');
    }
};
