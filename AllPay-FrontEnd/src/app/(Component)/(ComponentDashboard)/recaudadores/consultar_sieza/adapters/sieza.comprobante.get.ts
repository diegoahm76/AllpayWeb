import axios from 'axios';
import {
  GetSiezaComprobanteParams,
  SiezaComprobanteResponse
} from '../models/sieza.comprobante.types';

const baseApiUrl = process.env.BASE_API_URL;

export const getSiezaComprobante = async (
  token: string,
  params: GetSiezaComprobanteParams = {}
): Promise<SiezaComprobanteResponse> => {
  try {
    const query = new URLSearchParams();
    
    if (params.fecha_inicio) query.append('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) query.append('fecha_fin', params.fecha_fin);
    if (params.factura_unica !== undefined && params.factura_unica !== null) {
      query.append('factura_unica', String(params.factura_unica));
    }
    if (params.municipio) query.append('municipio', params.municipio);
    if (params.departamento) query.append('departamento', params.departamento);
    if (params.numero_documento) query.append('numero_documento', params.numero_documento);
    if (params.tipo_documento) query.append('tipo_documento', params.tipo_documento);

    const url = `${baseApiUrl}recaudos/siesa/comprobante/${query.toString() ? `?${query.toString()}` : ''}`;

    const response = await axios.get<SiezaComprobanteResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const payload = response.data;

    if (!payload?.success) {
      const detail = (payload as any)?.detail || 'Error en consulta comprobante del sistema contable';
      throw new Error(detail);
    }

    return payload;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en getSiezaComprobante:', {
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
