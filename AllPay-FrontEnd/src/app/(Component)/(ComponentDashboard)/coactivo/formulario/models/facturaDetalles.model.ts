/**
 * Modelos para Detalles de Factura
 */

// Información del proveedor
export interface ProveedorInfo {
  id_proveedor: number;
  nombre_completo_o_comercial: string;
  tipo_documento: string;
  numero_documento: string;
  municipio: string;
  departamento: string;
}

// Información del recaudador
export interface RecaudadorInfo {
  id_recaudador: number;
  fecha_compra: string;
  fecha_registro: string;
  tipo_documento: string;
  numero_documento: string;
  nombre_completo_o_comercial: string;
  telefono: string;
  email: string;
  direccion_notificaciones: string;
  municipio: string;
  departamento: string;
  nro_factura_unica: number;
  cod_tipo_comprador: string;
  nombres_tipo_comprador: string;
}

// Detalle de la factura
export interface DetalleFactura {
  id_detalle_factura_unica: number;
  id_factura_unica: number;
  id_porcentaje_cobro: number;
  nombre_tipo_cobro: string;
  cod_tipo_cobro: string;
  valor_porcentaje_cobro: number;
  id_tipo_cacao: number;
  nro_kilos: number;
  nombre_tipo_cacao: string;
  nombre_municipio_cacao: string;
  nombre_departamento_cacao: string;
  valor_kilo: string;
  valor_bruto: number;
  cuota_fomento: number;
  valor_neto: number;
  estado_factura: string;
  cod_estado_liquidacion: string;
  cod_estado_liquidacion_display: string;
  doc_soporte: string | null;
  doc_soporte_url: string | null;
  doc_pago_liquidacion: string | null;
  proveedor_info: ProveedorInfo;
  recaudador_info: RecaudadorInfo;
  nro_documento_soporte: string;
}

// Respuesta de la API
export interface FacturaDetallesResponse {
  success: boolean;
  detail: string;
  data: DetalleFactura[];
} 