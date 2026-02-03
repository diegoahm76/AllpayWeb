export interface AprobacionPlanPagoRequest {
    observacion_direccion: string;
}

export interface AprobacionPlanPagoResponse {
    success: boolean;
    detail: string;
    data: {
        id_plan_pago: number;
        estado_plan_pago: string;
        estado_plan_pago_display: string;
        fecha_aprobacion_juridica: string;
    };
} 