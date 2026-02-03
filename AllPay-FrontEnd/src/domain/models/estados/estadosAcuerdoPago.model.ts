export interface EstadoAcuerdoPago {
  value: string;
  label: string;
}

export interface EstadosAcuerdoPagoResponse {
  success: boolean;
  detail: string;
  data: [string, string][];
} 