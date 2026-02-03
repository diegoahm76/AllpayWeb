export interface PlanPagoPorSolicitudItem {
    id_solicitud: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    nro_plan_pago: number;
    tipo_documento_recaudador: string;
    nro_documento_recaudador: string;
    fecha_pago: string;
    nro_cuota: number;
    nro_factura: number;
    valor_factura: number;
}

export interface PlanPagoPorSolicitudData {
    success: boolean;
    detail: string;
    data: PlanPagoPorSolicitudItem[];
}

export interface PlanPago {
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: number;
    estado: string;
    estado_display: string;
    fecha_aprobacion_recaudo: string;
    fecha_aprobacion_juridica: string | null;
    fecha_aprobacion_direccion: string | null;
}

export interface Cuota {
    id_cuota: number;
    nro_cuota: number;
    valor_cuota: number;
    fecha_pago: string;
}

export interface PlanPagoData {
    id_solicitud: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    tipo_documento_recaudador: string;
    nro_documento_recaudador: string;
    plan_pago: PlanPago;
    cuotas: any[];
}

export interface PlanPagoPorSolicitudResponse {
    success: boolean;
    detail: string;
    data: PlanPagoData;
} 