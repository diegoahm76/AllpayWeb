export interface PlanPagoNotificacion {
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    valor_total_pagar: number;
    estado: string;
    estado_display: string;
    fecha_aprobacion_recaudo: string | null;
    fecha_aprobacion_juridica: string | null;
    fecha_aprobacion_direccion: string | null;
    id_solicitud: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_recaudador: string;
    observaciones: string;
}

export interface PlanesPagoNotificacionData {
    success: boolean;
    detail: string;
    data: PlanPagoNotificacion[];
}

export interface PlanesPagoNotificacionResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: PlanesPagoNotificacionData;
} 