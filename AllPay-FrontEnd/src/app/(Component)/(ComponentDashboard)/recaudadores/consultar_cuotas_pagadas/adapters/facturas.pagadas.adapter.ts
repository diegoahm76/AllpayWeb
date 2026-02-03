import axios from 'axios';
import { FacturasPagadasMapped } from '../models/facturas.pagadas.model';

const baseApiUrl = process.env.BASE_API_URL;

export const getFacturasPagadas = async (token: string): Promise<FacturasPagadasMapped> => {
    try {
        const url = `${baseApiUrl}cartera/facturas-pagadas/`;
        
        console.log('[getFacturasPagadas] - *** FUNCIÓN TODAS LAS FACTURAS EJECUTADA ***');
        console.log('[getFacturasPagadas] - URL de consulta:', url);
        
        const response = await axios.get(
            url,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Verificamos si la respuesta general fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener las facturas pagadas');
        }

        // Extraemos la información de paginación y los datos anidados
        // La estructura esperada es:
        // response.data = {success, count, total_pages, current_page, next, previous, data}
        // response.data.data = {success, detail, data[]}
        const responseData = response.data;
        const innerData = responseData.data || {};
        
        // Verificamos si innerData tiene éxito
        const innerSuccess = innerData.success || false;
        const innerDetail = innerData.detail || '';
        
        // Extraemos el array de facturas, que está en innerData.data
        const facturasData = Array.isArray(innerData.data) ? innerData.data : [];

        console.log('Facturas obtenidas:', facturasData.length);
        
        // Si no hay datos pero la respuesta fue exitosa, significa que no hay registros
        if (facturasData.length === 0 && innerSuccess) {
            return {
                success: true,
                detail: 'No se encontraron registros.',
                data: [],
                count: 0,
                total_pages: 1,
                current_page: 1,
                next: null,
                previous: null
            };
        }

        return {
            success: innerSuccess,
            detail: innerDetail,
            data: facturasData,
            count: 0,
            total_pages: 1,
            current_page: 1,
            next: null,
            previous: null
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener facturas pagadas:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            if (error.response?.status === 400 && error.response?.data?.detail) {
                // Devolver el mensaje específico del error de validación
                throw new Error(error.response.data.detail);
            }
            
            // Si el detalle es "No se encontraron registros.", eliminar el prefijo de error
            if (error.response?.data?.detail === "No se encontraron registros.") {
                throw new Error(error.response.data.detail);
            }
            
            throw new Error(`Error al obtener facturas pagadas: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};

// NOTA: Esta función está deprecated - el endpoint individual no existe en el servidor
// Usar getFacturasPagadasByMultipleIds([id]) en su lugar
export const getFacturasPagadasById = async (token: string, liquidacionId: string): Promise<FacturasPagadasMapped> => {
    try {
        const url = `${baseApiUrl}cartera/facturas-pagadas/${liquidacionId}/`;
        
        console.log('[getFacturasPagadasById] - *** FUNCIÓN ID INDIVIDUAL EJECUTADA (DEPRECATED) ***');
        console.log('[getFacturasPagadasById] - URL de consulta:', url);
        console.log('[getFacturasPagadasById] - ID a consultar:', liquidacionId);
        
        const response = await axios.get(
            url,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        // Verificamos si la respuesta general fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener las facturas pagadas por ID');
        }

        // Extraemos la información de paginación y los datos anidados
        const responseData = response.data;
        const innerData = responseData.data || {};
        
        // Verificamos si innerData tiene éxito
        const innerSuccess = innerData.success || false;
        const innerDetail = innerData.detail || '';
        
        // Extraemos el array de facturas, que está en innerData.data
        const facturasData = Array.isArray(innerData.data) ? innerData.data : [];

        console.log('Facturas por ID obtenidas:', facturasData.length);
        
        // Si no hay datos pero la respuesta fue exitosa, significa que no hay registros
        if (facturasData.length === 0 && innerSuccess) {
            return {
                success: true,
                detail: 'No se encontraron registros.',
                data: [],
                count: 0,
                total_pages: 1,
                current_page: 1,
                next: null,
                previous: null
            };
        }

        return {
            success: innerSuccess,
            detail: innerDetail,
            data: facturasData,
            count: 0,
            total_pages: 1,
            current_page: 1,
            next: null,
            previous: null
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error al obtener facturas pagadas por ID:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            if (error.response?.status === 400 && error.response?.data?.detail) {
                // Devolver el mensaje específico del error de validación
                throw new Error(error.response.data.detail);
            }
            
            // Si el detalle es "No se encontraron registros.", eliminar el prefijo de error
            if (error.response?.data?.detail === "No se encontraron registros.") {
                throw new Error(error.response.data.detail);
            }
            
            throw new Error(`Error al obtener facturas pagadas por ID: ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
};

// Nueva función para manejar múltiples IDs de liquidación con soporte para paginación
export const getFacturasPagadasByMultipleIds = async (
    token: string, 
    liquidacionIds: string[], 
    page: number = 1
): Promise<FacturasPagadasMapped> => {
    try {
        // Convertir el array de IDs a string separado por comas
        const idsParam = liquidacionIds.join(',');
        
        // Construir URL con parámetros
        const params = new URLSearchParams();
        params.append('ids_liquidacion', idsParam);
        if (page > 1) {
            params.append('page', page.toString());
        }
        
        const url = `${baseApiUrl}cartera/facturas-pagadas/?${params.toString()}`;
        
        console.log('[getFacturasPagadasByMultipleIds] - *** FUNCIÓN MÚLTIPLES IDs EJECUTADA ***');
        console.log('[getFacturasPagadasByMultipleIds] - URL de consulta:', url);
        console.log('[getFacturasPagadasByMultipleIds] - IDs a consultar:', liquidacionIds);
        console.log('[getFacturasPagadasByMultipleIds] - Página solicitada:', page);
        
        const response = await axios.get(
            url,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('[getFacturasPagadasByMultipleIds] - Respuesta recibida:', {
            status: response.status,
            success: response.data.success,
            dataLength: response.data.data?.data?.length || 0
        });

        // Verificamos si la respuesta general fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener las facturas pagadas por múltiples IDs');
        }

        // Extraemos la información de paginación y los datos anidados
        const responseData = response.data;
        const innerData = responseData.data || {};
        
        // Verificamos si innerData tiene éxito
        const innerSuccess = innerData.success || false;
        const innerDetail = innerData.detail || '';
        
        // Extraemos el array de facturas, que está en innerData.data
        const facturasData = Array.isArray(innerData.data) ? innerData.data : [];

        console.log('[getFacturasPagadasByMultipleIds] - Facturas obtenidas:', facturasData.length);
        
        // Si no hay datos pero la respuesta fue exitosa, significa que no hay registros
        if (facturasData.length === 0 && innerSuccess) {
            return {
                success: true,
                detail: 'No se encontraron registros para las liquidaciones seleccionadas.',
                data: [],
                count: responseData.count || 0,
                total_pages: responseData.total_pages || 0,
                current_page: responseData.current_page || 1,
                next: responseData.next || null,
                previous: responseData.previous || null
            };
        }

        return {
            success: innerSuccess,
            detail: innerDetail,
            data: facturasData,
            count: responseData.count || 0,
            total_pages: responseData.total_pages || 0,
            current_page: responseData.current_page || 1,
            next: responseData.next || null,
            previous: responseData.previous || null
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('[getFacturasPagadasByMultipleIds] - Error de Axios:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
            }
            
            if (error.response?.status === 400 && error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            
            if (error.response?.status === 404) {
                throw new Error('No se encontraron facturas para las liquidaciones seleccionadas.');
            }
            
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde.');
            }
            
            // Si el detalle es "No se encontraron registros.", eliminar el prefijo de error
            if (error.response?.data?.detail === "No se encontraron registros.") {
                throw new Error(error.response.data.detail);
            }
            
            throw new Error(`Error al obtener facturas pagadas por múltiples IDs: ${error.response?.data?.detail || error.message}`);
        }
        
        throw error;
    }
}; 