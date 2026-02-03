import axios from 'axios';

const baseApiUrl = process.env.BASE_API_URL;

export interface CollectorInvoice {
  id_factura_unica: number;
  nombre_persona_recaudador: string;
  nombre_persona_proveedor: string;
  nro_documento_proveedor: string;
  tipo_documento_proveedor: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  id_porcentaje_cobro: number;
  valor_porcentaje_cobro: number;
  cod_tipo_cobro: string;
  cod_tipo_comprador: string;
  nombre_cod_tipo_comprador: string;
  fecha_compra: string;
  nro_factura_unica: number;
  total_kilos: number;
  valor_bruto: string;
  cuota_fomento: string;
  valor_neto: string;
  doc_soporte: string;
  doc_soporte_url: string;
  fecha_doc_soporte: string;
  fecha_creacion: string;
  id_persona_recaudador: number;
  id_liq_factura_unica: number | null;
  id_persona_proveedor: number;
  id_municipio_cacao: string;
  id_departamento_cacao: string;
  id_persona_crea: number;
  cod_estado_liquidacion_display?: string;
}

export interface CollectorInvoicesResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: CollectorInvoice[];
}

export interface GetCollectorInvoicesParams {
  page?: number;
  page_size?: number;
  nombre_proveedor?: string;
  numero_documento_proveedor?: string;
  recaudador_nombre?: string;
  recaudador_apellido?: string;
  recaudador_tipo_documento?: string;
  recaudador_numero_documento?: string;
  recaudador_razon_social?: string;
  id_municipio_cacao?: string;
  id_departamento_cacao?: string;
  nro_factura_unica?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_documento_proveedor?: string;
  direccion_contacto_recaudador?: string;
  telefono_contacto_recaudador?: string;
  email_contacto_recaudador?: string;
  sin_paginacion?: boolean;
  solo_no_pagadas?: boolean;
  liquidadas?: boolean;
}

export const getCollectorInvoices = async (
  params: GetCollectorInvoicesParams,
  token: string
): Promise<CollectorInvoicesResponse> => {
  try {
    const queryParams = new URLSearchParams();

    // Agregar parámetros solo si tienen valor
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params.nombre_proveedor) queryParams.append('nombre_proveedor', params.nombre_proveedor);
    //if (params.numero_documento_proveedor) queryParams.append('numero_documento_proveedor', params.numero_documento_proveedor);
    if (params.numero_documento_proveedor) queryParams.append('recaudador_numero_documento', params.numero_documento_proveedor);
    if (params.recaudador_nombre) queryParams.append('recaudador_nombre', params.recaudador_nombre);
    if (params.recaudador_apellido) queryParams.append('recaudador_apellido', params.recaudador_apellido);
    if (params.recaudador_tipo_documento) queryParams.append('recaudador_tipo_documento', params.recaudador_tipo_documento);
    if (params.recaudador_numero_documento) queryParams.append('recaudador_numero_documento', params.recaudador_numero_documento);
    if (params.recaudador_razon_social) queryParams.append('recaudador_razon_social', params.recaudador_razon_social);
    if (params.id_municipio_cacao) queryParams.append('id_municipio_cacao', params.id_municipio_cacao);
    if (params.id_departamento_cacao) queryParams.append('id_departamento_cacao', params.id_departamento_cacao);
    if (params.nro_factura_unica) queryParams.append('nro_factura_unica', params.nro_factura_unica.toString());
    if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
    if (params.tipo_documento_proveedor) queryParams.append('recaudador_tipo_documento', params.tipo_documento_proveedor);

    if (params.direccion_contacto_recaudador) queryParams.append('direccion_contacto_recaudador', params.direccion_contacto_recaudador);
    if (params.telefono_contacto_recaudador) queryParams.append('telefono_contacto_recaudador', params.telefono_contacto_recaudador);
    if (params.email_contacto_recaudador) queryParams.append('email_contacto_recaudador', params.email_contacto_recaudador);
    if (params.sin_paginacion) queryParams.append('sin_paginacion', 'true');
    if (params.solo_no_pagadas) queryParams.append('solo_no_pagadas', 'true');
    if (typeof params.liquidadas === 'boolean') queryParams.append('liquidadas', params.liquidadas ? 'true' : 'false');

    const url = `${baseApiUrl}recaudos/facturas-recaudadores/all/?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.data.success) {
      throw new Error('La respuesta del servidor no fue exitosa');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error en la petición:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Error al obtener facturas: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}; 