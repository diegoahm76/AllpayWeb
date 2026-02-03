import axios from 'axios';
import { PazSalvoDateResponse } from '../models/pazSalvoDate.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

const baseApiUrl = getBaseApiUrl();

export const getFacturasPagadasFechasVigentes = async (token: string): Promise<PazSalvoDateResponse> => {
    try {
        console.log('[getFacturasPagadasFechasVigentes] - Obteniendo fechas vigentes de facturas pagadas');
        console.log('URL:', `${baseApiUrl}cartera/fechas-vigentes-list/`);
        
        const response = await axios.get(`${baseApiUrl}cartera/fechas-vigentes-list/`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[getFacturasPagadasFechasVigentes] - Respuesta:', response.data);

        if (response.data.success) {
            // Filtrar solo las fechas de facturas pagadas (código FP)
            const facturasPagadasData = {
                ...response.data,
                data: response.data.data.filter((item: any) => item.cod_tipo_fecha === 'FP')
            };
            return facturasPagadasData;
        } else {
            throw new Error(response.data.detail || 'Error al obtener las fechas de vigencia de Facturas Pagadas');
        }
    } catch (error) {
        console.error('[getFacturasPagadasFechasVigentes] - Error:', error);
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || 'Error al obtener las fechas de vigencia de Facturas Pagadas');
        }
        throw error;
    }
}; 