import axios from 'axios';
import { 
    ReporteProduccionNacionalCacaoParams,
    ReporteProduccionNacionalCacaoResponse 
} from '../models/reporteProduccionNacionalCacao.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte consolidado de producción nacional de cacao
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta para el reporte
 * @returns Promise con la respuesta del reporte
 */
export const obtenerReporteProduccionNacionalCacao = async (
    token: string,
    params: ReporteProduccionNacionalCacaoParams
): Promise<ReporteProduccionNacionalCacaoResponse> => {
    try {

        // Construir parámetros de consulta
        const queryParams: any = {};

        // Agregar parámetros de paginación
        if (params.page !== undefined) queryParams.page = params.page;
        if (params.page_size !== undefined) queryParams.page_size = params.page_size;

        // Agregar filtros de fecha si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;

        // Agregar filtros de ubicación si están presentes
        if (params.id_departamento_cacao) queryParams.departamento = params.id_departamento_cacao;
        if (params.id_municipio_cacao) queryParams.municipio = params.id_municipio_cacao;

        const response = await axios.get<ReporteProduccionNacionalCacaoResponse>(
            `${baseApiUrl}reportes/reporte-consolidado-produccion-nacional-cacao/`,
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
            console.error('[obtenerReporteProduccionNacionalCacao] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error('Error al obtener el reporte de producción nacional de cacao');
        }

        // Verificar que se hayan recibido los datos
        if (!response.data.data || !response.data.data.data) {
            console.error('[obtenerReporteProduccionNacionalCacao] - No se encontraron datos en la respuesta:', response.data);
            throw new Error('No se encontraron datos en el reporte');
        }

        return response.data;

    } catch (error) {
        console.error('[obtenerReporteProduccionNacionalCacao] - Error:', error);
        
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
                throw new Error('Error en la petición del reporte');
            }
        }
        
        // Si es un error que ya tiene mensaje (como los que lanzamos en el try), re-lanzarlo
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Error inesperado al obtener el reporte de producción nacional de cacao');
    }
}; 