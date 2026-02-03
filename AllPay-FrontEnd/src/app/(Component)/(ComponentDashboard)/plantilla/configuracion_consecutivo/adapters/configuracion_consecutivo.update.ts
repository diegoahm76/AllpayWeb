import axios from 'axios';
import { 
    ConfiguracionConsecutivoResponse, 
    ConfiguracionConsecutivoUpdateParams 
} from '@/app/(Component)/(ComponentDashboard)/plantilla/configuracion_consecutivo/models/configuracion_consecutivo.model';

const baseApiUrl = process.env.BASE_API_URL;

export const updateConfiguracionConsecutivo = async (
    params: ConfiguracionConsecutivoUpdateParams
): Promise<ConfiguracionConsecutivoResponse> => {
    try {
        const url = `${baseApiUrl}documentos/configuracion_consecutivo/${params.id}/`;

        const response = await axios.patch(url, params.payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${params.token}`
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.detail || 'Error al actualizar la configuración de consecutivos');
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error en la petición PATCH:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(`Error al actualizar configuración: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};
