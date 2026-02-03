/**
 * Modelos para Actualización de Cobros Persuasivos
 */

// Payload para actualizar un cobro persuasivo
export interface UpdateCobroPersuasivoPayload {
  descripcion: string;
  fecha_registro: string;
  id_accion_cobro_persuasivo: number;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
}

// Información de la factura asociada
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

// Datos del cobro persuasivo actualizado
export interface CobroPersuasivoUpdatedData {
  id_cobro_persuasivo: number;
  persona_crea_nombre: string;
  factura_asociada: FacturaAsociada;
  doc_persuasivo_url: string;
  accion_cobro_persuasivo_info: AccionCobroPersuasivoInfo;
  cod_accion_registrada: string;
  descripcion: string;
  consecutivo: string;
  fecha_registro: string;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  documento_adjunto: string;
  fecha_creacion: string;
  id_accion_cobro_persuasivo: number;
  doc_persuasivo: number;
  id_persona_crea: number;
}

// Respuesta de la API para actualización de cobro persuasivo
export interface UpdateCobroPersuasivoResponse {
  success: boolean;
  data: CobroPersuasivoUpdatedData;
  message: string;
}

// Parámetros para la función de actualización
export interface UpdateCobroPersuasivoParams {
  id: number;
  payload: UpdateCobroPersuasivoPayload;
}
