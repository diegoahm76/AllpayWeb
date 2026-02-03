/**
 * Modelos para Actualización de Acciones de Cobro Coactivo
 */

// Modelo para el payload de la petición PATCH
export interface ActualizarAccionCoactivoPayload {
  descripcion: string;
  id_accion_cobro_persuasivo: number;
  aplicar_plantilla: boolean;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  fecha_registro: string;
}

// Modelo para factura asociada en la respuesta
export interface FacturaAsociadaCoactivo {
  id_factura: number;
  nro_factura: number;
  valor_capital: number;
  valor_intereses: number;
  fecha_inclusion: string;
}

// Modelo para información de acción de cobro
export interface AccionCobroInfoCoactivo {
  id_accion: number;
  nombre: string;
  descripcion: string;
  tipo_cobro: string;
}

// Modelo para información de persona que crea
export interface PersonaCreaInfoCoactivo {
  id_persona: number;
  nombre_completo: string;
  numero_documento: string;
}

// Modelo para los datos de la respuesta exitosa
export interface AccionCoactivoActualizadaData {
  id_cobro_coactivo: number;
  cobro_persuasivo: any;
  cod_accion_registrada: string;
  descripcion: string;
  consecutivo: string;
  estado: string;
  fecha_registro: string;
  fecha_inicio_coactivo: string;
  fecha_limite_pago: string | null;
  id_accion_cobro_persuasivo: number;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string | null;
  valor_total_deuda: string;
  valor_intereses: string;
  valor_costas_procesales: string;
  aplicar_plantilla: boolean;
  documento_adjunto: string | null;
  doc_coactivo: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  id_persona_crea: number;
  cobro_persuasivo_info: any;
  accion_cobro_info: AccionCobroInfoCoactivo;
  facturas_asociadas: FacturaAsociadaCoactivo[];
  persona_crea_info: PersonaCreaInfoCoactivo;
  valor_total_calculado: number;
}

// Modelo para la respuesta exitosa de la API
export interface ActualizarAccionCoactivoSuccessResponse {
  success: true;
  data: AccionCoactivoActualizadaData;
  message: string;
}

// Modelo para la respuesta de error de la API
export interface ActualizarAccionCoactivoErrorResponse {
  success: false;
  message: string;
  detail?: string;
}

// Modelo unificado para la respuesta de la API
export type ActualizarAccionCoactivoResponse = 
  | ActualizarAccionCoactivoSuccessResponse 
  | ActualizarAccionCoactivoErrorResponse;

// Modelo para el estado de alertas
export interface ActualizacionAlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
  showAlertSuccess: boolean;
}

// Modelo para formulario de actualización
export interface FormDataActualizarAccion {
  descripcion: string;
  id_accion_cobro_persuasivo: number;
  aplicar_plantilla: boolean;
  nombre_recaudador: string;
  email_recaudador: string;
  celular_recaudador: string;
  fecha_registro: string;
}

// Modelo para el estado del hook
export interface ActualizarAccionCoactivoState {
  isLoading: boolean;
  alertState: ActualizacionAlertState;
  formData: FormDataActualizarAccion;
}
