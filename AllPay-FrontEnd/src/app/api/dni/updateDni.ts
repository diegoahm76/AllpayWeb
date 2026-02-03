import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

interface UpdateDniData {
    nombre: string;
    activo: boolean;
}

export const updateDni = async (token: string, codTipoDocumento: string, data: UpdateDniData): Promise<boolean> => {

    try {
        const response = await axios.put(`${baseApiUrl}personas/tipos-documento/update/${codTipoDocumento}/`, data, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al actualizar el tipo de documento');
        }

        return true;
    } catch (error: any) {

        throw new Error(error.response?.data?.detail || 'Error al actualizar el tipo de documento');
    }
};
