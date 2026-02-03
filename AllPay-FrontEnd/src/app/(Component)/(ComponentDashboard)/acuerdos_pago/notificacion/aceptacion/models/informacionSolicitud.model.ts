export interface InformacionSolicitudResponse {
    success: boolean;
    detail: string;
    data: InformacionSolicitudData;
}

export interface InformacionSolicitudData {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    numero_solicitud: number;
    numero_plan_pago: number;
    numero_cuotas_plan_pago: number;
    valor_total_a_pagar: number;
    estado_plan_pago: string;
    estado_display: string;
    observacion_juridica: string | null;
    observacion_direccion: string | null;
    fecha_aprobacion_recaudo: string;
    fecha_aprobacion_juridica: string | null;
    fecha_aprobacion_direccion: string | null;
} 