export interface AgregarFacturaCuotaPayload {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    id_facturas: number[];
    fecha_pago: string;
}

export interface Cuota {
    id: number;
    id_plan_pago: number;
    nro_cuota: number;
    fecha_vencimiento: string;
    valor_cuota: number;
    pagada: boolean;
    fecha_pago: string | null;
    id_liquidacion: number | null;
}

export interface DetalleAcuerdoPago {
    id_detalle_acuerdo_pago: number;
    id_solicitud_acuerdo_pago: number;
    id_factura_unica: number;
    id_cuota_acuerdo_pago: number;
}

export interface PlanPagoActualizado {
    id_plan_pago: number;
    id_solicitud_acuerdo_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: number;
    estado: string;
    fecha_notificacion: string | null;
    doc_acuerdo_pago: string | null;
}

export interface AgregarFacturaCuotaResponse {
    success: boolean;
    detail: string;
    facturas_agregadas: number[];
    cuota: Cuota;
    detalles_acuerdo_pago_actualizados: DetalleAcuerdoPago[];
    plan_pago_actualizado: PlanPagoActualizado;
} 