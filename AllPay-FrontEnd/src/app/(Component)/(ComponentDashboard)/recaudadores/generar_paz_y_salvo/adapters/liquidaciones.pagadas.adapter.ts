import axios from 'axios';
import { LiquidacionesPagadasMapped } from '../models/liquidaciones.pagadas.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface LiquidacionesPagadasFilters {
    page?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_documento?: string;
    numero_documento?: string;
}

export const getLiquidacionesPagadas = async (
    token: string,
    filters?: LiquidacionesPagadasFilters
): Promise<LiquidacionesPagadasMapped> => {
    try {
        // Construir la URL del endpoint
        let url = `${baseApiUrl}cartera/liquidaciones-pagadas/`;
        
        // Agregar parámetros
        const params = new URLSearchParams();
        
        if (filters?.page && filters.page > 1) {
            params.append('page', filters.page.toString());
        }

        if (filters?.fecha_inicio) {
            params.append('fecha_inicio', filters.fecha_inicio);
        }

        if (filters?.fecha_fin) {
            params.append('fecha_fin', filters.fecha_fin);
        }

        if (filters?.tipo_documento) {
            params.append('tipo_documento', filters.tipo_documento);
        }

        if (filters?.numero_documento) {
            params.append('numero_documento', filters.numero_documento);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
    
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Verificamos si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener las liquidaciones pagadas');
        }

        // Extraemos los datos de la respuesta
        const responseData = response.data;
        const liquidacionesData = Array.isArray(responseData.data?.data) ? responseData.data.data : [];

        console.log('[getLiquidacionesPagadas] - Liquidaciones obtenidas:', liquidacionesData.length);
        
        // Si no hay datos pero la respuesta fue exitosa, significa que no hay registros
        if (liquidacionesData.length === 0 && responseData.success) {
            return {
                success: true,
                count: 0,
                total_pages: 0,
                current_page: 1,
                next: null,
                previous: null,
                data: []
            };
        }

        return {
            success: responseData.success,
            count: responseData.count,
            total_pages: responseData.total_pages,
            current_page: responseData.current_page,
            next: responseData.next,
            previous: responseData.previous,
            data: liquidacionesData
        };
    } catch (error) {
        console.error('[getLiquidacionesPagadas] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('[getLiquidacionesPagadas] - Error de Axios:', {
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
                throw new Error('No se encontraron liquidaciones pagadas.');
            }
            
            if (error.response?.status === 500) {
                throw new Error('Error interno del servidor. Intente nuevamente más tarde.');
            }
            
            // Si el detalle es "No se encontraron registros.", eliminar el prefijo de error
            if (error.response?.data?.detail === "No se encontraron registros.") {
                throw new Error(error.response.data.detail);
            }
            
            throw new Error(`Error al obtener liquidaciones pagadas: ${error.response?.data?.detail || error.message}`);
        }
        
        throw error;
    }
}; 