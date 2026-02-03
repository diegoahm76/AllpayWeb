export interface SolicitudLiquidacion {
    // Campos comunes
    nro_solicitud: number;
    nro_plan_pago: number;
    fecha_solicitud: string;
    estado_display: string;
    estado: string;
    observaciones: string;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_recaudador: string;
    
    // Campos de externo
    id_solicitud_acuerdo_pago?: number;
    valor_total_pagar?: number;
    cuota_fomento_total?: number;
    intereses_total?: number;
    dias_mora?: number;
    fecha_pago?: string;
    id_recaudador?: number;
    facturas_asociadas?: string;
    
    // Campos de interno
    id_solicitud?: number;
    id_plan_pago?: number;
    valor_a_pagar?: number;
    id_persona_solicita?: number;
}

export interface DataSolicitudesLiquidacion {
    success: boolean;
    detail: string;
    data: SolicitudLiquidacion[];
}

export interface SolicitudesLiquidacionResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DataSolicitudesLiquidacion;
} 