import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface FacturaLiquidadaPSE {
  id_factura_unica: number;
  nro_factura_unica: number;
  nombre_persona_recaudador: string;
  nombre_persona_proveedor: string;
  nro_documento_proveedor: string;
  tipo_documento_proveedor: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  id_porcentaje_cobro: number;
  valor_porcentaje_cobro: number;
  cod_tipo_cobro: string;
  cod_tipo_cobro_nombre?: string;
  fecha_compra: string;
  total_kilos: number;
  valor_bruto: string;
  cuota_fomento: string;
  valor_neto: string;
  nro_documento_soporte: string;
  doc_soporte_url: string;
  fecha_doc_soporte: string;
  fecha_creacion: string;
  id_persona_recaudador: number;
  id_liq_factura_unica: number | null;
  id_persona_proveedor: number;
  id_municipio_cacao: string;
  id_departamento_cacao: string;
  id_persona_crea: number;
  cod_estado_liquidacion: string;
  cod_estado_liquidacion_display: string;
  doc_pago_liquidacion?: string;
}

export interface FacturasLiquidadasPSEResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: FacturaLiquidadaPSE[];
  detail?: string;
}

/**
 * Obtiene ÚNICAMENTE las facturas en estado "Liquidado" (no "Pagado") para el módulo PSE
 */
export const getFacturasLiquidadasPendientesPSE = async (
  token: string,
  page: number = 1,
  searchParams?: Record<string, any>
): Promise<FacturasLiquidadasPSEResponse> => {
  try {
    // Preparar parámetros para la solicitud
    const params: any = {
      page,
      ...searchParams,
      // Agregar un parámetro estado_liquidacion=L para filtrar solo las facturas liquidadas (no pagadas)
      estado_liquidacion: 'L'  // L = Liquidado (no pagado)
    };

    // Si se especifica sin_paginacion, no incluir el parámetro page
    if (searchParams?.sin_paginacion) {
      delete params.page;
    }

    // Hacer la solicitud al endpoint
    const response = await axios.get<FacturasLiquidadasPSEResponse>(
      `${baseApiUrl}recaudos/facturas-recaudador-externo/?liquidadas=true`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        params
      }
    );

    // Console log para ver la respuesta completa de la API
    console.log('Respuesta API facturas PSE:', {
      url: `${baseApiUrl}recaudos/facturas-recaudador-externo/?liquidadas=true`,
      params,
      responseData: response.data
    });

    // Verificar si la respuesta es exitosa
    if (!response.data.success) {
      throw new Error(response.data.detail || 'Error al obtener las facturas liquidadas para PSE');
    }

    // Filtro adicional en el cliente para asegurar que solo se devuelvan facturas con estado "Liquidado"
    const facturasFiltradas = response.data.data.filter(
      factura => 
        // Filtrar SOLO por estado "Liquidado" (excluir "Pagado" y otros estados)
        factura.cod_estado_liquidacion === 'L' && 
        factura.cod_estado_liquidacion_display === 'Liquidado'
    );

    // Devolver los resultados filtrados
    return {
      ...response.data,
      data: facturasFiltradas,
      count: facturasFiltradas.length
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en getFacturasLiquidadasPendientesPSE:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.detail || 'Error al obtener las facturas liquidadas para PSE');
    }
    throw new Error('Error inesperado al obtener las facturas liquidadas para PSE');
  }
}; 