export interface CuotaActualizada {
    id_cuota_acuerdo_pago: number;
    fecha_vencimiento: string;
    nro_cuota: number;
}

export interface PlanPagoActualizado {
    id_plan_pago: number;
    valor_total_pagar: number;
    estado: string;
}

export interface ActualizarCuotaPayload {
    fecha_pago: string;
}

export interface ActualizarCuotaResponse {
    success: boolean;
    detail: string;
    cuotas_actualizadas: CuotaActualizada[];
    plan_pago_actualizado: PlanPagoActualizado;
} 