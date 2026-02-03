import axios from 'axios';
import { 
    ReporteAcuerdosPagoResponse, 
    ReporteAcuerdosPagoMapped,
    ReporteAcuerdosPagoParams 
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/models/reporteAcuerdosPago.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte de recaudo por acuerdos de pago
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros de fecha
 * @returns Promise con la respuesta del reporte
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

        const response = await axios.get<ReporteAcuerdosPagoResponse>(
            `${baseApiUrl}reportes/recaudo-por-acuerdos-pago/`,
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
            console.error('[getReporteAcuerdosPago] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.data?.detail || 'Error al obtener el reporte de acuerdos de pago');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !Array.isArray(response.data.data.data)) {
            console.error('[getReporteAcuerdosPago] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: ReporteAcuerdosPagoMapped = {
            success: response.data.success,
            registros: response.data.data.data.map(registro => ({
                ...registro,
                // Asegurar que los campos numéricos sean números
                total_kilos: Number(registro.total_kilos) || 0,
                valor_cuota_fomento: Number(registro.valor_cuota_fomento) || 0,
                precio_promedio: Number(registro.precio_promedio) || 0,
                valor_intereses: Number(registro.valor_intereses) || 0,
                agno_pago: Number(registro.agno_pago) || new Date().getFullYear(),
                // Asegurar que los campos de texto sean strings válidos
                nombre_recaudador: String(registro.nombre_recaudador || ''),
                tipo_documento_recaudador: String(registro.tipo_documento_recaudador || ''),
                numero_documento_recaudador: String(registro.numero_documento_recaudador || ''),
                cod_tipo_comprador_recaudador: String(registro.cod_tipo_comprador_recaudador || ''),
                nombres_tipo_comprador: String(registro.nombres_tipo_comprador || ''),
                nro_doc_pago: String(registro.nro_doc_pago || ''),
                fecha_pago: String(registro.fecha_pago || ''),
                fecha_creacion: String(registro.fecha_creacion || '')
            })),
            sumatorias: response.data.data.sumatorias,
            count: response.data.count,
            total_pages: response.data.total_pages,
            current_page: response.data.current_page,
            next: response.data.next,
            previous: response.data.previous
        };

        return mappedResponse;

    } catch (error) {
        console.error('[getReporteAcuerdosPago] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('No autorizado. Por favor, inicie sesión nuevamente.');
            } else if (error.response?.status === 403) {
                throw new Error('No tiene permisos para acceder a este recurso.');
            } else if (error.response?.status === 404) {
                throw new Error('El recurso solicitado no fue encontrado.');
            } else if (error.response?.status && error.response?.status >= 500) {
                throw new Error('Error del servidor. Por favor, intente más tarde.');
            } else {
                throw new Error(error.response?.data?.detail || 'Error en la petición');
            }
        }
        
        throw error;
    }
}; 