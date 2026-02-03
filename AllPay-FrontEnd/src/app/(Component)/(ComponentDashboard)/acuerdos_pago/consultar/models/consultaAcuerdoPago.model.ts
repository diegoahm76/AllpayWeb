export interface AcuerdoPago {
    id_solicitud_acuerdo_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    estado_display?: string;
    estado_plan_pago?: string;
    estado_plan_pago_display?: string;
    numero_documento?: string;
    recaudador?: {
      numero_documento: string;
    };
    valor_total_pagar: string | number;
    observaciones: string;
  }
  
export interface ApiResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    data: {
      success: boolean;
      detail: string;
      data: AcuerdoPago[];
    };
    next: string | null;
    previous: string | null;
  }