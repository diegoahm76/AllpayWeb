export interface InformacionSolicitudRecaudadorData {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    observaciones: string;
    doc_solicitud: string;
    fecha_solicitud: string;
    observacion_juridica: string;
    fecha_aprobacion_juridica: string;
    valor_total_pagar: number;
    fecha_aprobacion: string;
    doc_acuerdo_pago?: string;
    fecha_notificacion?: string;
    observaciones_solicitud?: string;
    // Propiedades adicionales que vienen de la API de notificación
    numero_solicitud?: number;
    numero_plan_pago?: number;
    numero_cuotas_plan_pago?: number;
    valor_total_a_pagar?: number;
    observacion_direccion?: string | null;
    fecha_aprobacion_recaudo?: string;
    fecha_aprobacion_direccion?: string | null;
}

export interface InformacionSolicitudRecaudadorResponse {
    success: boolean;
    detail: string;
    data: InformacionSolicitudRecaudadorData;
} 