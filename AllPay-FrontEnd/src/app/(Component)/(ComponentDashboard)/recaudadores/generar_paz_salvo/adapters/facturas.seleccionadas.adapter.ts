import axios from 'axios';
import { FacturaSeleccionadaResponse } from '@/app/(Component)/(ComponentDashboard)/recaudadores/generar_paz_salvo/models/facturas.seleccionadas.model';

// Función para obtener la URL base de la API
const getBaseApiUrl = () => {
    const configuredUrl = process.env.BASE_API_URL;
    if (!configuredUrl) {
        console.warn('[getBaseApiUrl] - ⚠️ No se ha configurado BASE_API_URL en las variables de entorno');
    }
    return configuredUrl && configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
};

export const getFacturasSeleccionadas = async (token: string, idsFacturas: number[]): Promise<FacturaSeleccionadaResponse> => {
    try {
        if (!token) {
            console.error('No se proporcionó token de autenticación');
            return {
                success: false,
                detail: 'No se proporcionó token de autenticación',
                data: []
            };
        }

        if (!idsFacturas || idsFacturas.length === 0) {
            console.error('No se proporcionaron IDs de facturas');
            return {
                success: false,
                detail: 'No se proporcionaron IDs de facturas',
                data: []
            };
        }

        // Filtrar valores inválidos o duplicados
        const idsValidos = [...new Set(idsFacturas.filter(id => typeof id === 'number' && id > 0))];
        
        if (idsValidos.length === 0) {
            console.error('No se proporcionaron IDs de facturas válidos');
            return {
                success: false,
                detail: 'No se proporcionaron IDs de facturas válidos',
                data: []
            };
        }

        // Construir el parámetro de consulta con los IDs de las facturas separados por coma
        const idsParam = idsValidos.join(',');
        const url = `${getBaseApiUrl()}cartera/facturas-pagadas-seleccionadas/?ids_facturas=${idsParam}`;
        
        console.log('URL de consulta para facturas seleccionadas:', url);
        console.log('Cantidad de IDs a consultar:', idsValidos.length);
        
        // Configurar un timeout de 15 segundos para la petición
        const response = await axios.get(
            url,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                timeout: 15000 // 15 segundos de timeout
            }
        );

        console.log('Respuesta recibida, código:', response.status);

        // Verificar si la respuesta fue exitosa
        if (!response.data || !response.data.success) {
            const detail = response.data?.detail || 'No se recibió una respuesta válida del servidor';
            console.error('Error en la respuesta del API:', detail);
            return {
                success: false,
                detail,
                data: []
            };
        }

        // Asegurar que los datos son un array
        const facturasData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log('Facturas recuperadas:', facturasData.length);

        if (facturasData.length === 0) {
            console.warn('La API devolvió una respuesta exitosa pero sin facturas');
            return {
                success: true,
                detail: 'No se encontraron facturas con los criterios especificados',
                data: []
            };
        }

        return {
            success: response.data.success,
            detail: response.data.detail || 'Facturas recuperadas exitosamente',
            data: facturasData
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status;
            const responseData = error.response?.data;
            const errorMessage = responseData?.detail || error.message;
            
            console.error('Error al obtener facturas seleccionadas:', {
                status: statusCode,
                statusText: error.response?.statusText,
                data: responseData,
                message: errorMessage,
                url: error.config?.url
            });
            
            // Mensajes de error más específicos según el tipo de error
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    detail: 'La solicitud ha excedido el tiempo de espera. Por favor, inténtelo de nuevo.',
                    data: []
                };
            }
            
            if (!error.response) {
                return {
                    success: false,
                    detail: 'Error de red. Por favor, verifique su conexión e inténtelo de nuevo.',
                    data: []
                };
            }
            
            if (statusCode === 401) {
                return {
                    success: false,
                    detail: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
                    data: []
                };
            }
            
            if (statusCode === 400) {
                return {
                    success: false,
                    detail: `Error en la solicitud: ${errorMessage || 'Verifique los datos proporcionados'}`,
                    data: []
                };
            }
            
            if (statusCode === 404) {
                return {
                    success: false,
                    detail: 'No se encontraron facturas con los IDs proporcionados.',
                    data: []
                };
            }
            
            if (statusCode === 500) {
                return {
                    success: false,
                    detail: 'Error en el servidor. Por favor, contacte al administrador del sistema.',
                    data: []
                };
            }
            
            return {
                success: false,
                detail: `Error al obtener facturas seleccionadas: ${errorMessage}`,
                data: []
            };
        }
        
        // Error no controlado
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido al obtener facturas';
        console.error('Error no controlado:', errorMsg);
        
        return {
            success: false,
            detail: errorMsg,
            data: []
        };
    }
}; 