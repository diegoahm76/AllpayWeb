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
      page = 1,
      page_size = 10,
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
      page,
      page_size,
      solo_mora_sin_acuerdo: true // Parámetro requerido según especificación
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


    const response = await axios.get<CarteraMoraResponse>(
      `${baseApiUrl}cartera/cartera-consulta-interno/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: queryParams
      }
    );


    // Validar estructura de respuesta
    if (!response.data.results) {
      throw new Error('Estructura de respuesta inválida');
    }

    return response.data;
  } catch (error) {
    console.error('[getCarteraMora] - Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // Retornar datos vacíos en lugar de lanzar error para 404
        return {
          count: 0,
          next: null,
          previous: null,
          results: {
            success: true,
            detail: 'No se encontraron registros de cartera en mora',
            data: [],
            totales: {
              total_kilos: 0,
              total_cuota_fomento: 0,
              total_interes: 0
            }
          }
        };
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