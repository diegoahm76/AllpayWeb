// Modelo para el payload de la petición
export interface ConversionMultiplePayload {
  facturas: number[];
}

// Modelo para factura asociada en la respuesta
export interface FacturaAsociada {
  id_factura: number;
  nro_factura: number;
  valor_capital: number;
  valor_intereses: number;
  fecha_inclusion: string;
}

// Modelo para información de acción de cobro
export interface AccionCobroInfo {
  id_accion: number;
  nombre: string;
  descripcion: string;
  tipo_cobro: string;
}

// Modelo para información de persona que crea
export interface PersonaCreaInfo {
  id_persona: number;
  nombre_completo: string;
  numero_documento: string;
}

// Modelo para los datos de la respuesta exitosa
export interface ConversionMultipleData {
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
  accion_cobro_info: AccionCobroInfo;
  facturas_asociadas: FacturaAsociada[];
  persona_crea_info: PersonaCreaInfo;
  valor_total_calculado: number;
}

// Modelo para la respuesta exitosa de la API
export interface ConversionMultipleSuccessResponse {
  success: true;
  data: ConversionMultipleData;
  message: string;
}

// Modelo para la respuesta de error de la API
export interface ConversionMultipleErrorResponse {
  success: false;
  message: string;
}

// Modelo unificado para la respuesta de la API
export type ConversionMultipleResponse = ConversionMultipleSuccessResponse | ConversionMultipleErrorResponse;

// Modelo para el estado de alertas
export interface ConversionAlertState {
  showAlertNotification: boolean;
  alertMessage: string;
  showErrorAlert: boolean;
  errorAlertMessage: string;
  showAlertSuccess: boolean;
}

// Modelo para el estado del hook
export interface ConversionMultipleState {
  isLoading: boolean;
  alertState: ConversionAlertState;
  selectedFacturas: number[];
}
