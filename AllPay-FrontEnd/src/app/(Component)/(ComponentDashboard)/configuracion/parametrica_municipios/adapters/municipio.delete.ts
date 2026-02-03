import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface MunicipioDeleteResponse {
    success: boolean;
    detail: string;
}

export const deleteMunicipio = async (
    token: string, 
    idMunicipio: string
): Promise<MunicipioDeleteResponse> => {
    try {
        const url = `${baseApiUrl}personas/municipios/${idMunicipio}/`;

        const response = await axios.delete(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.data.success === false) {
            throw new Error(response.data.detail || 'Error al eliminar el municipio');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en deleteMunicipio:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al eliminar municipio: ${error.response?.data?.detail || error.message}`);
        }
        throw new Error('Error inesperado al eliminar municipio');
    }
};
