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
  activo?: boolean;
}

// Modelo para documento adjunto en la nueva estructura
export interface DocumentoAdjunto {
  nombre_archivo: string | null;
  url_descarga: string | null;
  tiene_documento: boolean;
}

// Modelo para acción de cobro en la nueva estructura
export interface AccionCobro {
  id_accion: number;
  nombre: string;
  descripcion: string;
}

// Modelo para una acción de cobro persuasivo individual (respuesta actualizada del API)
export interface CobroPersuasivoDetail {
  id_cobro_coactivo: number;
  consecutivo: string;
  cod_accion_registrada: string;
  descripcion: string;
  estado: string;
  fecha_registro: string;
  nombre_recaudador: string;
  documento_recaudador: string;
  celular_recaudador: string | null;
  email_recaudador: string;
  fecha_compra: string;
  nro_factura_unica: number;
  plantilla: boolean;
  accion_registrada: string;
  acciones: any;
  accion_cobro: AccionCobro;
  persona_crea: string;
  documento_adjunto: DocumentoAdjunto;
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
  fechaCompra: string;
  personaCrea: string;
  // Datos de factura
  nroFactura: number;
  // Nuevos campos de la respuesta actualizada
  estado: string;
  documentoRecaudador: string;
  plantilla: boolean;
  tieneDocumento: boolean;
  nombreArchivo: string | null;
  // URL del documento persuasivo generado por el sistema
  docPersuasivoUrl: string | null;
} 