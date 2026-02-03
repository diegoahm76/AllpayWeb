export interface AprobacionPlanPagoRequest {
    vo_bo_area_recaudo: string;
    vo_bo_juridica: string;
    aprobacion_direccion: string;
    fecha_aprobacion: string;
    observacion_direccion: string;
}

export interface AprobacionPlanPagoResponse {
    success: boolean;
    detail: string;
    data: {
        id_plan_pago: number;
        estado: string;
        fecha_aprobacion_juridica: string;
    };
} 