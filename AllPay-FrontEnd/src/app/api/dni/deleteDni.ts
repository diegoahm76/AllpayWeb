import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export const deleteDni = async (token: string, codTipoDocumento: string): Promise<boolean> => {
    try {
        const response = await axios.delete(`${baseApiUrl}personas/tipos-documento/delete/${codTipoDocumento}/`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al eliminar el tipo de documento');
        }

        return true;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Error al eliminar el tipo de documento');
    }
};
