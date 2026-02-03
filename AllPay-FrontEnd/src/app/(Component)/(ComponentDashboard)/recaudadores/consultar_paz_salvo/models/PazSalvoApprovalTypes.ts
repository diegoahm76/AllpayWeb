// Interfaz para la solicitud de aprobación/desaprobación de paz y salvo
export interface PazSalvoApprovalRequest {
  es_aprobacion: boolean;
  observacion?: string;
}

// Interfaz para la respuesta de aprobación/desaprobación de paz y salvo
export interface PazSalvoApprovalResponse {
  success: boolean;
  detail: string;
}

// Interfaz para el estado del hook
export interface PazSalvoApprovalState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  message: string;
}

// Tipos de acciones
export type PazSalvoApprovalAction = 
  | { type: 'APPROVAL_START' }
  | { type: 'APPROVAL_SUCCESS', payload: PazSalvoApprovalResponse }
  | { type: 'APPROVAL_ERROR', payload: string }
  | { type: 'RESET_STATE' }; 