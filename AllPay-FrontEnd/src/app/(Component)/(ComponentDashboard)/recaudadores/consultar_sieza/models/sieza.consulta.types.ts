export interface SiezaConsultaItem {
  fecha_registro: string; // YYYY-MM-DD
  no_factura_unica: number;
  fecha_compra: string; // YYYY-MM-DD
  nit_cc_recaudador: string;
  nombre_recaudador: string;
  departamento_procedencia_cacao: string;
  municipio_procedencia_cacao: string;
  total_kilos: number;
  valor_cuota_fomento: string; // viene como string en ejemplo
  valor_intereses: number; // viene como número
  mes_recaudo: string;
}

export interface SiezaConsultaDataPayload {
  success: boolean;
  detail: string;
  data: SiezaConsultaItem[];
  total_cuota_fomento: number;
  total_intereses: number;
}

export interface SiezaConsultaResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: SiezaConsultaDataPayload;
}

export interface GetSiezaConsultaParams {
  page?: number;
  page_size?: number;
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
  no_factura_unica?: number;
  tipo_documento_proveedor?: string;
  numero_documento_proveedor?: string;
  nombre_proveedor?: string;
  recaudador_nombre?: string;
  recaudador_apellido?: string;
  id_departamento_cacao?: number;
  id_municipio_cacao?: number;
  cod_tipo_comprador?: string;
  sin_paginacion?: boolean;
}


