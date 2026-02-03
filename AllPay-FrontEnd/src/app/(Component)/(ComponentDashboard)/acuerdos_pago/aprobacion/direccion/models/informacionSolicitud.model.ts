export interface InformacionSolicitudDireccionData {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    observaciones: string;
    doc_solicitud: string;
    fecha_solicitud: string;
    observacion_juridica: string | null;
    fecha_aprobacion_juridica: string;
    valor_total_pagar: number;
    fecha_aprobacion: string;
}

export interface InformacionSolicitudDireccionResponse {
    success: boolean;
    detail: string;
    data: InformacionSolicitudDireccionData;
} 