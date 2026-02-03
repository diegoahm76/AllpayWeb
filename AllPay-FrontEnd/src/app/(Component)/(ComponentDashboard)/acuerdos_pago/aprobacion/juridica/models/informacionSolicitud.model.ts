export interface InformacionSolicitudData {
    id_solicitud_acuerdo_pago: number;
    id_plan_pago: number;
    nro_plan_pago: number;
    nro_cuotas: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    observaciones: string;
    doc_solicitud: string;
    fecha_solicitud: string;
    valor_total_pagar: number;
    fecha_aprobacion: string;
}

export interface InformacionSolicitudResponse {
    success: boolean;
    detail: string;
    data: InformacionSolicitudData;
} 