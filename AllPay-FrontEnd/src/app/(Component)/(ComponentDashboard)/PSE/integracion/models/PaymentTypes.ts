// Interfaces para el modelo de pago PSE con OpenPay

// Estructura para el documento del cliente
export interface PseDocument {
  person_type: string;      // 0: Persona Natural, 1: Persona Jurídica
  document_type: string;    // Tipo de documento (03: CC, 06: NIT, etc.)
  document_number: string;  // Número de documento
}

// Estructura para la información de captura de pago
export interface PseCapture {
  bankCode: string;         // Código del banco PSE
  document: PseDocument;    // Documento del cliente
}

// Estructura para la información del cliente
export interface PseCustomer {
  name: string;             // Nombres del cliente
  last_name: string;        // Apellidos del cliente
  email: string;            // Email del cliente
  phone_number: string;     // Teléfono del cliente
  address: string;          // Dirección del cliente
}

// Estructura para la solicitud de pago PSE
export interface PsePaymentRequest {
  method: string;           // Método de pago, siempre "bank_account" para PSE
  amount: number;           // Monto del pago en pesos colombianos
  description: string;      // Descripción del pago
  order_id: string;         // ID de orden única generada por el comercio
  currency: string;         // Moneda, siempre "COP" para Colombia
  iva: string;              // Valor del IVA
  customer: PseCustomer;    // Información del cliente
  redirect_url: string;     // URL de redirección después del pago
  capture: PseCapture;      // Información de captura de pago
}

// Estructura para el método de pago en la respuesta
export interface PsePaymentMethodResponse {
  url: string;              // URL para redireccionar al cliente
  type: string;             // Tipo de redirección
}

// Estructura para la respuesta del pago PSE
export interface PsePaymentResponse {
  id: string;               // ID de transacción generado por OpenPay
  payment_method: PsePaymentMethodResponse; // Método de pago con URL de redirección
}

// Estructura para la respuesta completa que incluye manejo de errores
export interface ProcessedPsePaymentResponse {
  success: boolean;         // Indica si la operación fue exitosa
  data?: PsePaymentResponse; // Datos de la respuesta
  error?: string;           // Mensaje de error si success es false
  redirectUrl?: string;     // URL de redirección extraída para facilidad de uso
}

// Estructura para el estado del hook
export interface PsePaymentState {
  payment: PsePaymentResponse | null;
  isLoading: boolean;
  error: string | null;
  redirectUrl: string | null;
}

// Tipos de acciones para el reducer
export type PsePaymentAction = 
  | { type: 'PAYMENT_START' }
  | { type: 'PAYMENT_SUCCESS', payload: PsePaymentResponse }
  | { type: 'PAYMENT_ERROR', payload: string }
  | { type: 'RESET_PAYMENT' }
  | { type: 'RESET_ERROR' }; 