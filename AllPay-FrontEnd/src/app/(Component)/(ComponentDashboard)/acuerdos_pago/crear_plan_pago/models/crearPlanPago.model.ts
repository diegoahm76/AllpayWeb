export interface Liquidacion {
    id_liq_factura_unica: number;
    cod_estado: string;
    nro_doc_pago: string;
    fecha_pago: string;
    valor_pagar: string;
    valor_intereses: string;
    fecha_liquidacion: string;
    id_persona_liquida: number;
    doc_pago: number;
    codigo_barras: string;
}

export interface PlanPago {
    id_plan_pago: number;
    id_solicitud_acuerdo_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: string;
    estado: string;
    fecha_notificacion: string | null;
    doc_acuerdo_pago: number | null;
}

export interface Cuota {
    id_cuota_acuerdo_pago: number;
    id_plan_pago: number;
    nro_cuota: number;
    fecha_vencimiento: string;
    valor_cuota: string;
    pagada: boolean;
    fecha_pago: string | null;
    id_liquidacion: number;
}

export interface DetalleActualizado {
    id_detalle_acuerdo_pago: number;
    id_solicitud_acuerdo_pago: number;
    id_factura_unica: number;
    id_cuota_acuerdo_pago: number;
}

export interface CrearPlanPagoResponse {
    success: boolean;
    detail: string;
    liquidacion: Liquidacion;
    plan_pago: PlanPago;
    cuota: Cuota;
    detalle_actualizado: DetalleActualizado;
}

export interface CrearPlanPagoPayload {
    id_solicitud_acuerdo_pago: number;
    id_facturas: number[];
    fecha_pago: string;
} 