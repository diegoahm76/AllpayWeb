/**
 * Modelos para Detalle de Cobros Persuasivos
 * Basado en la respuesta del endpoint GET /api/cartera/cobros-persuasivos/{id}/
 */

// Modelo para factura asociada dentro de la acción de cobro
export interface FacturaAsociada {
  id_factura: number;
  nro_factura: number;
  valor_neto: number;
  fecha_compra: string;
  recaudador: string;
}

// Información de la acción de cobro persuasivo
export interface AccionCobroPersuasivoInfo {
  id_accion: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// Modelo para una acción de cobro persuasivo individual (respuesta completa del API)
export interface CobroPersuasivoDetail {
  id_cobro_persuasivo: number;
  cod_accion_registrada: string;
  descripcion: string;
  consecutivo: string;
  fecha_registro: string;
  id_accion_cobro_persuasivo: number | null;
  accion_cobro_persuasivo_info: AccionCobroPersuasivoInfo | null;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  aplicar_plantilla_display: string;
  documento_adjunto: string | null;
  documento_adjunto_url: string | null;
  fecha_creacion: string;
  persona_crea_nombre: string;
  factura_asociada: FacturaAsociada;
  doc_persuasivo_url: string | null;
}

// Respuesta completa del API para obtener cobros persuasivos
export interface CobroPersuasivoDetailResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: CobroPersuasivoDetail[];
}

// Parámetros para búsqueda de cobros persuasivos
export interface CobroPersuasivoDetailParams {
  page?: number;
  page_size?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

// Modelo transformado para la tabla en el frontend
export interface CobroPersuasivoTabla {
  idCobroPersuasivo: number;
  codigoAccion: string;
  descripcion: string;
  consecutivo: string;
  fechaRegistro: string;
  accionRegistrar: string;
  nombreRecaudador: string;
  emailRecaudador: string;
  celularRecaudador: string;
  aplicarPlantilla: string;
  documentoAdjunto: string;
  documentoAdjuntoUrl: string | null;
  fechaCreacion: string;
  personaCrea: string;
  // Datos de factura
  idFactura: number;
  nroFactura: number;
  valorNeto: number;
  fechaCompra: string;
  recaudador: string;
  // URL del documento persuasivo
  docPersuasivoUrl: string | null;
} 