export interface NotificacionAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    liquidaciones: Liquidacion[];
    facturas_actualizadas: FacturaActualizada[];
    cuotas_actualizadas: CuotaActualizada[];
    planes_actualizados: PlanActualizado[];
    solicitudes_actualizadas: SolicitudActualizada[];
}

export interface Liquidacion {
    id_liquidacion: number;
    cuota_fomento_total: number;
    valor_intereses_total: number;
    valor_a_pagar: number;
    codigo_barras: string;
    doc_pago: number;
    doc_pago_url: string;
    fecha_liquidacion: string;
    estado: string;
    estado_display: string;
    facturas_liquidadas: number[];
}

export interface FacturaActualizada {
    id_factura_unica: number;
    estado_factura: string;
}

export interface CuotaActualizada {
    id_cuota_acuerdo_pago: number;
    fecha_vencimiento: string;
    valor_cuota: number;
    id_plan_pago: number;
}

export interface PlanActualizado {
    id_plan_pago: number;
    fecha_notificacion: string;
    doc_acuerdo_pago: number;
    doc_acuerdo_pago_url: string;
    estado: string;
    estado_display: string;
}

export interface SolicitudActualizada {
    id_solicitud_acuerdo_pago: number;
    estado: string;
    estado_display: string;
    doc_solicitud: string;
} 