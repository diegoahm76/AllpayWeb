import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

interface CreateDniData {
    cod_tipo_documento: string;
    nombre: string;
}

export const createDni = async (token: string, data: CreateDniData): Promise<boolean> => {
    try {
        const response = await axios.post(`${baseApiUrl}personas/tipos-documento/create/`, data, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al crear el tipo de documento');
        }

        return true;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Error al crear el tipo de documento');
    }
};
