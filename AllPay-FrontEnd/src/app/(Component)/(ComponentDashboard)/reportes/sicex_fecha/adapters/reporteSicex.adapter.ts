import axios from 'axios';
import { 
    ReporteSicexResponse, 
    ReporteSicexMapped,
    ReporteSicexParams 
} from '../models/reporteSicex.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte SICEX
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros
 * @returns Promise con la respuesta del reporte
 */
export const getReporteSicex = async (
    token: string,
    params: ReporteSicexParams
): Promise<ReporteSicexMapped> => {
    try {

        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_fin) queryParams.fecha_fin = params.fecha_fin;
        if (params.tipo_cargue) queryParams.tipo_cargue = params.tipo_cargue;
        if (params.pais) queryParams.pais = params.pais;
        if (params.posicion) queryParams.posicion = params.posicion;
        if (params.via) queryParams.via = params.via;
        if (params.empresa_declarante) queryParams.empresa_declarante = params.empresa_declarante;

        const response = await axios.get<ReporteSicexResponse>(
            `${baseApiUrl}reportes/reporte-sicex/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[getReporteSicex] - La API indicó que la petición no fue exitosa:', response.data);
            // Si no hay datos, mostrar el mensaje del detail
            if (response.data.detail) {
                throw new Error(response.data.detail);
            }
            throw new Error('Error al obtener el reporte SICEX');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !response.data.data.cargue_sicex) {
            console.error('[getReporteSicex] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }


        // Los registros ya tienen la estructura correcta, no necesitan mapeo adicional
        const registrosMapeados = response.data.data.cargue_sicex || [];

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: ReporteSicexMapped = {
            success: response.data.success,
            registros: registrosMapeados,
            count: response.data.count || 0,
            total_pages: response.data.total_pages || 1,
            current_page: response.data.current_page || 1,
            next: response.data.next || null,
            previous: response.data.previous || null,
            // Mapear totales desde los datos de la respuesta
            total_peso: response.data.data?.total_peso || '0',
            total_toneladas: response.data.data?.total_toneladas || '0',
            total_valor_cif: response.data.data?.total_valor_cif || '$0',
            total_valor_fob: response.data.data?.total_valor_fob || '$0'
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getReporteSicex] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            // Si la respuesta tiene un detail, usarlo como mensaje de error
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            }
            
            // Si no hay detail, manejar por código de estado
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error('Error en la petición');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al obtener el reporte SICEX');
    }
}; 