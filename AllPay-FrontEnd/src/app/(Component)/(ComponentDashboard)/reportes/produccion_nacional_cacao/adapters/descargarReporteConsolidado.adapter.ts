import axios from 'axios';
import { 
    DescargarReporteConsolidadoParams,
    DescargarReporteConsolidadoResponse 
} from '../models/descargarReporteConsolidadoProduccion.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Genera el documento Excel del reporte consolidado de producción nacional de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta para el reporte
 * @returns Promise con la respuesta del documento
 */
export const descargarReporteConsolidado = async (
    token: string,
    params: DescargarReporteConsolidadoParams
): Promise<DescargarReporteConsolidadoResponse> => {
    try {
        console.log('[descargarReporteConsolidado] - Iniciando generación del documento Excel...');
        console.log('[descargarReporteConsolidado] - URL:', `${baseApiUrl}reportes/documento-reporte-consolidado-produccion-nacional-cacao/`);
        console.log('[descargarReporteConsolidado] - Parámetros:', params);
        console.log('[descargarReporteConsolidado] - Token presente:', !!token);

        // Construir el payload para la petición POST
        const payload: any = {};

        // Agregar parámetros de paginación si están presentes
        if (params.page !== undefined) payload.page = params.page;
        if (params.page_size !== undefined) payload.page_size = params.page_size;

        // Agregar filtros de fecha si están presentes
        if (params.fecha_inicio) payload.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) payload.fecha_final = params.fecha_final;

        // Agregar filtros de ubicación si están presentes
        if (params.id_departamento_cacao) payload.departamento = params.id_departamento_cacao;
        if (params.id_municipio_cacao) payload.municipio = params.id_municipio_cacao;

        const response = await axios.post<DescargarReporteConsolidadoResponse>(
            `${baseApiUrl}reportes/documento-reporte-consolidado-produccion-nacional-cacao/`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('[descargarReporteConsolidado] - Respuesta del servidor:', {
            status: response.status,
            success: response.data.success,
            detail: response.data.detail
        });

        // Validar estructura de respuesta
        if (!response.data.success) {
            console.error('[descargarReporteConsolidado] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.detail || 'Error al generar el documento Excel del reporte consolidado');
        }

        // Verificar que se haya generado el documento
        if (!response.data.data || !response.data.data.url_documento) {
            console.error('[descargarReporteConsolidado] - No se encontró la URL del archivo en la respuesta:', response.data);
            throw new Error('No se pudo generar el documento Excel del reporte');
        }

        console.log('[descargarReporteConsolidado] - Documento Excel generado exitosamente:', response.data.data.url_documento);
        console.log('[descargarReporteConsolidado] - Total ubicaciones:', response.data.data.total_ubicaciones);
        console.log('[descargarReporteConsolidado] - Período:', response.data.data.periodo);

        return response.data;

    } catch (error) {
        console.error('[descargarReporteConsolidado] - Error:', error);
        
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
                throw new Error('Error en la petición de generación del documento Excel');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al generar el documento Excel del reporte consolidado');
    }
}; 