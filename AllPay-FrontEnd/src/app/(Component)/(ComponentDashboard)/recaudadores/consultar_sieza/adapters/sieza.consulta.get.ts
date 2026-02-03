import axios from 'axios';
import {
  GetSiezaConsultaParams,
  SiezaConsultaResponse
} from '../models/sieza.consulta.types';

const baseApiUrl = process.env.BASE_API_URL;

export const getSiezaConsulta = async (
  token: string,
  params: GetSiezaConsultaParams = {}
): Promise<SiezaConsultaResponse> => {
  try {
    const query = new URLSearchParams();

    if (params.page) query.append('page', String(params.page));
    if (params.page_size) query.append('page_size', String(params.page_size));
    if (params.fecha_desde) query.append('fecha_inicio', params.fecha_desde);
    if (params.fecha_hasta) query.append('fecha_fin', params.fecha_hasta);
    if (typeof params.no_factura_unica === 'number') {
      query.append('factura_unica', String(params.no_factura_unica));
    }
    if (params.tipo_documento_proveedor) query.append('tipo_documento', params.tipo_documento_proveedor);
    if (params.numero_documento_proveedor) query.append('numero_documento', params.numero_documento_proveedor);
    if (params.nombre_proveedor) query.append('razon_social', params.nombre_proveedor);
    if (params.recaudador_nombre) query.append('recaudador_nombre', params.recaudador_nombre);
    if (params.recaudador_apellido) query.append('recaudador_apellido', params.recaudador_apellido);
    if (params.id_departamento_cacao) query.append('departamento', String(params.id_departamento_cacao));
    if (params.id_municipio_cacao) query.append('municipio', String(params.id_municipio_cacao));
    if (params.cod_tipo_comprador) query.append('cod_tipo_comprador', params.cod_tipo_comprador);
    if (params.sin_paginacion) query.append('sin_paginacion', String(params.sin_paginacion));

    const url = `${baseApiUrl}recaudos/consulta/facturas-unicas/${query.toString() ? `?${query.toString()}` : ''}`;

    const response = await axios.get<SiezaConsultaResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const payload = response.data;

    if (!payload?.success || !payload?.data?.success) {
      const detail = (payload as any)?.data?.detail || (payload as any)?.detail || 'Error en consulta del sistema contable';
      throw new Error(detail);
    }

    return payload;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en getSiezaConsulta:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const detail = (error.response?.data as any)?.detail || error.message;
      throw new Error(detail);
    }
    throw error;
  }
};


