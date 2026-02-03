export interface SolicitudAprobacion {
    id_solicitud: number;
    id_plan_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    estado_display: string;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_recaudador: string;
    observaciones: string;
    valor_a_pagar: number;
}

export interface DataSolicitudesAprobacion {
    success: boolean;
    detail: string;
    data: SolicitudAprobacion[];
}

export interface SolicitudesAprobacionResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DataSolicitudesAprobacion;
} 