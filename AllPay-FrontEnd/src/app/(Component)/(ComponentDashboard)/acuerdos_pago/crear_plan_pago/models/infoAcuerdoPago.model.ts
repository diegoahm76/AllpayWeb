export interface PlanPago {
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: number;
    estado: string;
}

export interface InfoAcuerdoPagoData {
    id_solicitud: number;
    nro_solicitud: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_factura: number;
    id_plan_pago?: number;
}

export interface InfoAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    data: InfoAcuerdoPagoData;
} 