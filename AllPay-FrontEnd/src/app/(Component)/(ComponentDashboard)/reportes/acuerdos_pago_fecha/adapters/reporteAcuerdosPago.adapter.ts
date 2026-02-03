import axios from 'axios';
import { 
    ReporteAcuerdosPagoResponse, 
    ReporteAcuerdosPagoMapped,
    ReporteAcuerdosPagoParams 
} from '../models/reporteAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;
// Actualizado para manejar campos de error del backend

/**
 * Obtiene el reporte consolidado de acuerdos de pago
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros de fecha
 * @returns Promise con la respuesta del reporte consolidado
 */
export const getReporteAcuerdosPago = async (
    token: string,
    params: ReporteAcuerdosPagoParams
): Promise<ReporteAcuerdosPagoMapped> => {
    try {

        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_fin = params.fecha_final;
        if (params.estado) queryParams.estado = params.estado;
        if (params.nombre_recaudador) queryParams.nombre_recaudador = params.nombre_recaudador;

        const response = await axios.get<ReporteAcuerdosPagoResponse>(
            `${baseApiUrl}reportes/reporte-consolidado-acuerdos-pago/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        console.log('[getReporteAcuerdosPago] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            acuerdosLength: response.data.data?.length || 0,
            detail: response.data.detail || 'No detail provided'
        });

        // Verificar si la respuesta fue exitosa en el nivel de aplicación
        if (!response.data.success) {
            // Extraer el mensaje específico del backend
            const errorMessage = response.data.detail || 
                                response.data.message || 
                                response.data.error ||
                                'Error al obtener el reporte consolidado de acuerdos de pago';
            
            console.log('[getReporteAcuerdosPago] - Error del backend:', errorMessage);
            throw new Error(errorMessage);
        }

        // Extraer y procesar los datos
        const responseData = response.data;
        const acuerdosData = Array.isArray(responseData.data) ? responseData.data : [];

        console.log('[getReporteAcuerdosPago] - Acuerdos obtenidos:', acuerdosData.length);

        // Retornar datos mapeados
        return {
            success: true,
            acuerdos: acuerdosData,
            count: responseData.count,
            total_pages: responseData.total_pages,
            current_page: responseData.current_page,
            next: responseData.next,
            previous: responseData.previous
        };

    } catch (error) {
        console.error('[getReporteAcuerdosPago] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            // Obtener información detallada del error
            const status = error.response?.status;
            const statusText = error.response?.statusText;
            
            // Intentar extraer el mensaje de error del backend
            let errorMessage = 'Error al obtener el reporte consolidado de acuerdos de pago';
            
            if (error.response?.data) {
                // Intentar diferentes campos donde puede venir el mensaje de error
                errorMessage = error.response.data.detail || 
                              error.response.data.message || 
                              error.response.data.error ||
                              error.response.data.msg ||
                              errorMessage;
            }
            
            // Agregar información del status si es relevante
            if (status) {
                if (status === 401) {
                    errorMessage = 'No tiene permisos para acceder a este reporte. Por favor, inicie sesión nuevamente.';
                } else if (status === 403) {
                    errorMessage = 'No tiene autorización para acceder a este reporte.';
                } 
                 else if (status >= 500) {
                    errorMessage = 'Error del servidor. Por favor, intente nuevamente más tarde.';
                } else if (status === 400) {
                    // Para errores 400, el mensaje del servidor suele ser más específico
                    errorMessage = error.response?.data?.detail || 
                                  error.response?.data?.message || 
                                  'Los parámetros de consulta no son válidos.';
                }
            }
            
            console.error('[getReporteAcuerdosPago] - Error HTTP:', { status, statusText, message: errorMessage });
            throw new Error(errorMessage);
        }
        
        // Para errores que no son de Axios (red, timeout, etc.)
        if (error instanceof Error) {
            const errorMessage = error.message || 'Error inesperado al obtener el reporte consolidado de acuerdos de pago';
            throw new Error(errorMessage);
        }
        
        throw new Error('Error inesperado al obtener el reporte consolidado de acuerdos de pago');
    }
}; 