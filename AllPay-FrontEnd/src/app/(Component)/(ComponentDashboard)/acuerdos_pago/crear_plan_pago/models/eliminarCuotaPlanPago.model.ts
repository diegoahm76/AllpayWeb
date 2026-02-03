export interface PlanPago {
    id_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: number;
    estado: string;
}

export interface EliminarCuotaPlanPagoResponse {
    success: boolean;
    detail: string;
    cuotas: any[];
    detalles: any[];
    plan_pago: PlanPago;
} 