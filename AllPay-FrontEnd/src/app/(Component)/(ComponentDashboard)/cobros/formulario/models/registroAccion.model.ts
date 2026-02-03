/**
 * Modelos para Registro de Acciones de Cobro Persuasivo
 */

// Payload para crear una acción de cobro persuasivo
export interface CreateCobroPersuasivoPayload {
  factura: number;
  descripcion: string;
  fecha_registro: string;
  id_accion_cobro_persuasivo: number;
  // accion_registrar: string; // obsoleto, ahora se usa el id
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  documento_adjunto: File | null;
}

// Información de la factura asociada en la respuesta
export interface FacturaAsociada {
  id_factura: number;
  nro_factura: number;
  valor_neto: number;
  fecha_compra: string;
  recaudador: string;
}

// Datos de la acción creada en la respuesta
export interface CobroPersuasivoCreado {
  id_cobro_persuasivo: number;
  persona_crea_nombre: string;
  factura_asociada: FacturaAsociada;
  doc_persuasivo_url: string | null;
  cod_accion_registrada: string;
  descripcion: string;
  consecutivo: string;
  fecha_registro: string;
  accion_registrar: string;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  aplicar_plantilla: boolean;
  documento_adjunto: string | null;
  fecha_creacion: string;
  doc_persuasivo: string | null;
  id_persona_crea: number;
}

// Respuesta del API para crear cobro persuasivo
export interface CreateCobroPersuasivoResponse {
  success: boolean;
  data: CobroPersuasivoCreado;
  message: string;
} 