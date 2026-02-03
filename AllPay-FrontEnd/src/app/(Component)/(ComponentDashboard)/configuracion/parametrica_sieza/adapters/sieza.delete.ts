import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface SiezaDeleteResponse {
    success: boolean;
    detail: string;
}

export const deleteSiezaData = async (
    token: string, 
    id: number
): Promise<SiezaDeleteResponse> => {
    try {
        const url = `${baseApiUrl}recaudos/siesa/${id}/`;

        const response = await axios.delete(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al eliminar el registro del sistema contable');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en deleteSiezaData:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al eliminar registro del sistema contable: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al eliminar registro del sistema contable');
    }
};
