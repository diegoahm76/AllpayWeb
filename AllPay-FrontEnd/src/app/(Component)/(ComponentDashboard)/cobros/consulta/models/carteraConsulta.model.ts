// Modelo para factura de cartera en mora (response de la API)
export interface FacturaCarteraMoraAPI {
  id_factura_unica: number;
  nro_documento_recaudador: string;
  razon_social_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: number;
  factura_proveedor: string;
  nit_proveedor: string;
  nombre_proveedor: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  total_kilos: number;
  valor_bruto: string;
  cuota_fomento: string;
  valor_neto: string;
  dias_mora: number;
  nro_acuerdo_pago: string | null;
  valor_intereses: number;
  estado_acuerdo_pago: string | null;
  archivo: string;
  id_persona_recaudador: number;
  id_persona_proveedor: number;
  id_municipio_cacao: string;
  id_departamento_cacao: string;
}

// Modelo para los totales de la respuesta
export interface TotalesCarteraMora {
  total_kilos: number;
  total_cuota_fomento: number;
  total_interes: number;
}

// Modelo para la respuesta interna de datos
export interface CarteraMoraData {
  success: boolean;
  detail: string;
  totales?: TotalesCarteraMora; // Ahora es opcional ya que el API ya no lo devuelve
  data: FacturaCarteraMoraAPI[];
}

// Modelo para la respuesta completa de la API
export interface CarteraMoraResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CarteraMoraData;
}

// Modelo transformado para uso en la aplicación
export interface FacturaCarteraMora {
  id: number;
  documento_recaudador: string;
  razon_social_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: string;
  factura_proveedor: string;
  nit_proveedor: string;
  nombre_proveedor: string;
  municipio_cacao: string;
  departamento_cacao: string;
  total_kilos: number;
  valor_bruto: number;
  cuota_fomento: number;
  valor_neto: number;
  dias_mora: number;
  nro_acuerdo_pago: string;
  valor_intereses: number;
  estado_acuerdo_pago: string;
  archivo_url: string;
}

// Modelo para los totales transformados
export interface TotalesCartera {
  total_kilos: number;
  total_cuota_fomento: number;
  total_interes: number;
}

// Modelo para parámetros de búsqueda
export interface CarteraMoraBusquedaParams {
  page?: number;
  page_size?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  nro_documento_recaudador?: string;
  nro_factura_unica?: string;
  nit_proveedor?: string;
  nombre_proveedor?: string;
  municipio_cacao?: string;
  departamento_cacao?: string;
  dias_mora_min?: number;
  dias_mora_max?: number;
}

// Modelo para formulario de búsqueda
export interface FormDataCarteraMora {
  fechaInicio: string;
  fechaFinalizacion: string;
  documentoRecaudador: string;
  nroFactura: string;
  nitProveedor: string;
  nombreProveedor: string;
  municipio: string;
  departamento: string;
  diasMoraMin: string;
  diasMoraMax: string;
} 