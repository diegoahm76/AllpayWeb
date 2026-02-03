import axios from 'axios';
import { LiquidacionesPagadasMapped } from '../models/liquidaciones.pagadas.model';

const baseApiUrl = process.env.BASE_API_URL;

export interface LiquidacionesPagadasFilters {
    page?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    sin_paginacion?: boolean;
}

export const getLiquidacionesPagadas = async (
    token: string,
    pageOrFilters?: number | LiquidacionesPagadasFilters
): Promise<LiquidacionesPagadasMapped> => {
    try {
        // Construir la URL del endpoint
        let url = `${baseApiUrl}cartera/liquidaciones-pagadas/`;
        
        // Manejar parámetros: puede ser un número (page) o un objeto de filtros
        const params = new URLSearchParams();
        let filters: LiquidacionesPagadasFilters = {};
        
        if (typeof pageOrFilters === 'number') {
            // Compatibilidad con el uso anterior: solo número (página)
            filters.page = pageOrFilters;
        } else if (pageOrFilters && typeof pageOrFilters === 'object') {
            // Nuevo uso: objeto con filtros
            filters = pageOrFilters;
        }
        
        // Agregar parámetros de paginación
        if (filters.page && filters.page > 1) {
            params.append('page', filters.page.toString());
        }
        
        // Agregar parámetros de fecha
        if (filters.fecha_inicio) {
            params.append('fecha_inicio', filters.fecha_inicio);
        }
        
        if (filters.fecha_fin) {
            params.append('fecha_fin', filters.fecha_fin);
        }
        
        // Agregar parámetro sin_paginacion
        if (filters.sin_paginacion) {
            params.append('sin_paginacion', 'true');
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

        console.log('[getLiquidacionesPagadas] - Respuesta recibida:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            dataIsArray: Array.isArray(response.data.data),
            dataLength: Array.isArray(response.data.data) 
                ? response.data.data.length 
                : (response.data.data?.data?.length || 0)
        });

        // Verificamos si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener las liquidaciones pagadas');
        }

        // Extraemos los datos de la respuesta
        // Cuando sin_paginacion=true, data es un array directo
        // Cuando hay paginación, data está anidado en data.data
        const responseData = response.data;
        let liquidacionesData: any[] = [];
        
        if (Array.isArray(responseData.data)) {
            // Caso sin paginación: data es un array directo
            liquidacionesData = responseData.data;
        } else if (Array.isArray(responseData.data?.data)) {
            // Caso con paginación: data está anidado
            liquidacionesData = responseData.data.data;
        }

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

        // Cuando sin_paginacion=true, puede que count y total_pages no vengan en la respuesta
        // En ese caso, usamos el length del array como count y total_pages = 1
        const isSinPaginacion = filters.sin_paginacion === true;
        const count = responseData.count !== undefined ? responseData.count : liquidacionesData.length;
        const total_pages = responseData.total_pages !== undefined ? responseData.total_pages : (isSinPaginacion ? 1 : 0);
        const current_page = responseData.current_page !== undefined ? responseData.current_page : 1;

        return {
            success: responseData.success,
            count: count,
            total_pages: total_pages,
            current_page: current_page,
            next: responseData.next || null,
            previous: responseData.previous || null,
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