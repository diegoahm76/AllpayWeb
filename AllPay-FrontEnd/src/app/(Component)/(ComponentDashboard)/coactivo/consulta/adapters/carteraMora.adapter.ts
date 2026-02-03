import axios from 'axios';
import {
  CarteraMoraResponse,
  CarteraMoraBusquedaParams,
  FacturaCarteraMoraAPI,
  TotalesCarteraMora
} from '../models/carteraConsulta.model';

const baseApiUrl = process.env.BASE_API_URL;

/**
 * Obtiene las facturas de cartera en mora sin acuerdo de pago
 */
export const getCarteraMora = async (
  token: string,
  params: CarteraMoraBusquedaParams = {}
): Promise<CarteraMoraResponse> => {
  try {
    const {
      fecha_desde,
      fecha_hasta,
      nro_documento_recaudador,
      nro_factura_unica,
      nit_proveedor,
      nombre_proveedor,
      municipio_cacao,
      departamento_cacao,
      dias_mora_min,
      dias_mora_max
    } = params;

    // Construir parámetros de consulta
    const queryParams: any = {

    };

    // Agregar filtros opcionales si están presentes
    if (fecha_desde) queryParams.fecha_inicio = fecha_desde;
    if (fecha_hasta) queryParams.fecha_fin = fecha_hasta;
    if (nro_documento_recaudador) queryParams.numero_documento = nro_documento_recaudador;
    if (nro_factura_unica) queryParams.nro_factura_unica = nro_factura_unica;
    if (nit_proveedor) queryParams.nit_proveedor = nit_proveedor;
    if (nombre_proveedor) queryParams.nombre_proveedor = nombre_proveedor;
    if (municipio_cacao) queryParams.municipio_cacao = municipio_cacao;
    if (departamento_cacao) queryParams.departamento_cacao = departamento_cacao;
    if (dias_mora_min !== undefined) queryParams.dias_mora_min = dias_mora_min;
    if (dias_mora_max !== undefined) queryParams.dias_mora_max = dias_mora_max;

    const response = await axios.get<any>(
      `${baseApiUrl}cartera/cartera-consulta-coactivo/?estado_coactivo=ACTIVO`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: queryParams
      }
    );

    // Validar estructura de respuesta
    if (!response.data || !response.data.data) {
      throw new Error('Estructura de respuesta inválida');
    }

    // Detectar formato de items y mapear acorde a columnas de la tabla
    const items = response.data.data;
    const isTablaFormatoDirecto = items.length > 0 &&
      (items[0].nro_documento_recaudador !== undefined || items[0].valor_bruto !== undefined);

    const mappedData = isTablaFormatoDirecto
      // El backend ya entrega los campos como los espera la tabla (ejemplo provisto)
      ? items.map((item: any) => ({
          ...item,
          // Establecer id_row_numeric a id_factura_unica para selección estable
          id_row_numeric: item.id_factura_unica
        }))
      // Formato alterno (estructura coactivo previa): mapear a la forma de tabla
      : items.map((item: any) => ({
          id_row_numeric: Number(`${item.id_factura_unica}${item.cobro_coactivo?.id_cobro_coactivo ?? ''}`) || item.id_factura_unica,
          id_factura_unica: item.id_factura_unica,
          nro_documento_recaudador: item.recaudador_documento,
          razon_social_recaudador: item.recaudador_nombre,
          fecha_compra: item.fecha_compra,
          nro_factura_unica: item.nro_factura_unica,
          factura_proveedor: '',
          nit_proveedor: '',
          nombre_proveedor: '',
          nombre_municipio_cacao: '',
          nombre_departamento_cacao: '',
          total_kilos: 0,
          valor_bruto: (item.valor_bruto ?? 0).toString(),
          cuota_fomento: (item.cuota_fomento ?? 0).toString(),
          valor_neto: (item.valor_neto ?? 0).toString(),
          dias_mora: item.cobro_coactivo?.dias_en_coactivo || 0,
          nro_acuerdo_pago: null,
          valor_intereses: item.cobro_coactivo?.valor_intereses || 0,
          estado_acuerdo_pago: item.cobro_coactivo?.estado || null,
          archivo: '',
          id_persona_recaudador: 0,
          id_persona_proveedor: 0,
          id_municipio_cacao: '',
          id_departamento_cacao: ''
        }));

    const transformedResponse: CarteraMoraResponse = {
      count: response.data.pagination?.count ?? mappedData.length,
      next: response.data.pagination?.next ?? null,
      previous: response.data.pagination?.previous ?? null,
      results: {
        success: response.data.success,
        detail: response.data.detail,
        data: mappedData,
        totales: undefined
      }
    };

    return transformedResponse;
  } catch (error) {
    console.error('[getCarteraMora] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('No se encontraron registros de cartera en mora');
      }
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor, inicie sesión nuevamente');
      }
      if (error.response?.status === 403) {
        throw new Error('No tiene permisos para acceder a esta información');
      }
      throw new Error(error.response?.data?.detail || 'Error al obtener la cartera en mora');
    }
    throw new Error('Error de conexión al obtener la cartera en mora');
  }
};

/**
 * Obtiene todas las facturas de cartera en mora para exportación a Excel
 */
export const getAllCarteraMoraForExport = async (
  token: string,
  params: Omit<CarteraMoraBusquedaParams, 'page' | 'page_size'> = {}
): Promise<{ facturas: FacturaCarteraMoraAPI[]; totales: TotalesCarteraMora }> => {
  try {
    const allFacturas: FacturaCarteraMoraAPI[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    let totales: TotalesCarteraMora = {
      total_kilos: 0,
      total_cuota_fomento: 0,
      total_interes: 0
    };

    while (hasMorePages) {
      const response = await getCarteraMora(token, {
        ...params,
        page: currentPage,
        page_size: 100 // Solicitar más registros por página para exportación
      });

      if (response.results.success && response.results.data.length > 0) {
        allFacturas.push(...response.results.data);
        
        // Si el API no devuelve totales, los calculamos localmente
        if (response.results.totales) {
          totales = response.results.totales; // Los totales son globales, no por página
        } else {
          // Calcular totales acumulados de los datos recibidos
          for (const factura of response.results.data) {
            totales.total_kilos += factura.total_kilos || 0;
            totales.total_cuota_fomento += parseFloat(factura.cuota_fomento) || 0;
            totales.total_interes += factura.valor_intereses || 0;
          }
        }
        
        // Verificar si hay más páginas
        hasMorePages = response.next !== null;
        currentPage++;
      } else {
        hasMorePages = false;
      }

      // Protección contra bucles infinitos
      if (currentPage > 100) {
        console.warn('[getAllCarteraMoraForExport] - Límite de páginas alcanzado');
        break;
      }
    }


    return {
      facturas: allFacturas,
      totales
    };
  } catch (error) {
    console.error('[getAllCarteraMoraForExport] - Error:', error);
    throw error;
  }
};

/**
 * Descarga el archivo de una factura específica
 */
export const downloadFacturaFile = async (
  token: string,
  idFactura: number,
  tipoArchivo: number = 1
): Promise<Blob> => {
  try {
    const response = await axios.get(
      `${baseApiUrl}cartera/cartera-consulta-download/${idFactura}/${tipoArchivo}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob'
      }
    );

    return response.data;
  } catch (error) {
    console.error('[downloadFacturaFile] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Archivo no encontrado');
      }
      throw new Error('Error al descargar el archivo');
    }
    throw new Error('Error de conexión al descargar el archivo');
  }
}; 