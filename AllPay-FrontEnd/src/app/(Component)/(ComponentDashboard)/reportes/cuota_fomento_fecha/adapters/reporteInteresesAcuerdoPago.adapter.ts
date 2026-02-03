import axios from 'axios';
import { 
    ReporteInteresesAcuerdoPagoResponse, 
    ReporteInteresesAcuerdoPagoMapped,
    ReporteInteresesAcuerdoPagoParams 
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_fecha/models/reporteInteresesAcuerdoPago.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte de recaudo por intereses de acuerdo de pago
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros de fecha
 * @returns Promise con la respuesta del reporte
 */
export const getReporteInteresesAcuerdoPago = async (
    token: string,
    params: ReporteInteresesAcuerdoPagoParams
): Promise<ReporteInteresesAcuerdoPagoMapped> => {
    try {
        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_fin = params.fecha_final;

        const response = await axios.get<ReporteInteresesAcuerdoPagoResponse>(
            `${baseApiUrl}reportes/recaudo-por-intereses-acuerdo-pago/`,
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
            console.error('[getReporteInteresesAcuerdoPago] - La API indicó que la petición no fue exitosa:', response.data);
            throw new Error(response.data.data?.detail || 'Error al obtener el reporte de intereses de acuerdo de pago');
        }

        // Verificar la estructura de los datos
        if (!response.data.data || !Array.isArray(response.data.data.data)) {
            console.error('[getReporteInteresesAcuerdoPago] - Los datos no tienen la estructura esperada:', response.data);
            throw new Error('Formato de datos incorrecto');
        }

        // Mapear la respuesta al formato que usaremos en el hook
        const mappedResponse: ReporteInteresesAcuerdoPagoMapped = {
            success: response.data.success,
            registros: response.data.data.data.map(registro => ({
                ...registro,
                // Asegurar que los campos numéricos sean números
                valor_intereses: Number(registro.valor_intereses) || 0,
                // Asegurar que los campos de texto sean strings válidos
                nombre_recaudador: String(registro.nombre_recaudador || ''),
                mes: String(registro.mes || ''),
                tipo_documento_recaudador: String(registro.tipo_documento_recaudador || ''),
                numero_documento_recaudador: String(registro.numero_documento_recaudador || ''),
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
        console.error('[getReporteInteresesAcuerdoPago] - Error:', error);
        
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