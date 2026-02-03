import axios from 'axios';
import { 
    ReporteConsolidadoPagoCuotaFomentoResponse, 
    ReporteConsolidadoPagoCuotaFomentoMapped,
    ReporteConsolidadoPagoCuotaFomentoParams 
} from '@/app/(Component)/(ComponentDashboard)/reportes/cuota_fomento_recaudador/models/reporteConsolidadoPagoCuotaFomento.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene el reporte consolidado de pago de cuota de fomento
 * @param token Token de autenticación JWT
 * @param params Parámetros de consulta incluyendo paginación y filtros
 * @returns Promise con la respuesta del reporte consolidado
 */
export const getReporteConsolidadoPagoCuotaFomento = async (
    token: string,
    params: ReporteConsolidadoPagoCuotaFomentoParams
): Promise<ReporteConsolidadoPagoCuotaFomentoMapped> => {
    try {

        // Construir parámetros de consulta
        const queryParams: any = {
            page: params.page,
            page_size: params.page_size
        };

        // Agregar filtros opcionales si están presentes
        if (params.id_departamento_cacao) queryParams.id_departamento_cacao = params.id_departamento_cacao;
        if (params.id_municipio_cacao) queryParams.id_municipio_cacao = params.id_municipio_cacao;
        if (params.recaudador) queryParams.recaudador = params.recaudador;
        if (params.numero_documento_recaudador) queryParams.numero_documento_recaudador = params.numero_documento_recaudador;
        if (params.id_recaudador) queryParams.id_recaudador = params.id_recaudador;
        if (params.fecha_inicio) queryParams.fecha_inicio = params.fecha_inicio;
        if (params.fecha_final) queryParams.fecha_final = params.fecha_final;
        if (params.numero_documento_proveedor) queryParams.numero_documento_proveedor = params.numero_documento_proveedor;
        if (params.nombres_proveedor) queryParams.nombres_proveedor = params.nombres_proveedor;
        if (params.sin_paginacion) {
            queryParams.sin_paginacion = 'true';
            // Si sin_paginacion es true, no enviar parámetros de paginación
            delete queryParams.page;
            delete queryParams.page_size;
        }

        const response = await axios.get<ReporteConsolidadoPagoCuotaFomentoResponse>(
            `${baseApiUrl}reportes/reporte-consolidado-pago-cuota-fomento/`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: queryParams
            }
        );


        // Verificar si la respuesta fue exitosa
        if (!response.data.success) {
            throw new Error('Error al obtener el reporte consolidado de pago de cuota de fomento');
        }

        // Extraer y procesar los datos
        const responseData = response.data;
        const facturasData = Array.isArray(responseData.data?.facturas) ? responseData.data.facturas : [];
        const totalesData = responseData.data?.totales || {
            valor_cuota_fomento_total: 0,
            total_kilos_facturas: 0,
            total_kilos_ajustado: 0,
            total_valor_bruto: 0,
            total_valor_neto: 0
        };

        // Mapear las facturas para incluir los nuevos campos
        const facturasMapeadas = facturasData.map(factura => ({
            ...factura,
            // Asegurar que los campos numéricos sean números
            total_kilos: Number(factura.total_kilos) || 0,
            nro_kilos: Number(factura.nro_kilos) || 0,
            id_tipo_cacao: Number(factura.id_tipo_cacao) || 0,
            // Asegurar que los campos de valor sean strings
            valor_bruto: String(factura.valor_bruto || ''),
            cuota_fomento: String(factura.cuota_fomento || ''),
            valor_neto: String(factura.valor_neto || ''),
            valor_kilo: String(factura.valor_kilo || ''),
            // Asegurar que los arrays sean arrays válidos
            valores_kilo: Array.isArray(factura.valores_kilo) ? factura.valores_kilo : []
        }));

        // Retornar datos mapeados
        return {
            success: true,
            facturas: facturasMapeadas,
            totales: {
                valor_cuota_fomento_total: Number(totalesData.valor_cuota_fomento_total) || 0,
                total_kilos_facturas: Number(totalesData.total_kilos_facturas) || 0,
                total_kilos_ajustado: Number(totalesData.total_kilos_ajustado) || 0,
                total_valor_bruto: Number(totalesData.total_valor_bruto) || 0,
                total_valor_neto: Number(totalesData.total_valor_neto) || 0
            },
            count: responseData.count,
            total_pages: responseData.total_pages,
            current_page: responseData.current_page,
            next: responseData.next,
            previous: responseData.previous
        };

    } catch (error) {
        console.error('[getReporteConsolidadoPagoCuotaFomento] - Error:', error);
        
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               'Error al obtener el reporte consolidado de pago de cuota de fomento';
            throw new Error(errorMessage);
        }
        
        throw new Error('Error inesperado al obtener el reporte consolidado de pago de cuota de fomento');
    }
}; 