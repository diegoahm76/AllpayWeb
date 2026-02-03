export interface SolicitudAcuerdoPagoExterno {
    id_solicitud_acuerdo_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    valor_total_pagar: string;
    estado_display: string;
    estado: string;
    observaciones: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_recaudador: string;
}

export interface DataConsultaAcuerdoPagoExterno {
    success: boolean;
    detail: string;
    data: SolicitudAcuerdoPagoExterno[];
}

export interface ConsultaAcuerdoPagoExternoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: DataConsultaAcuerdoPagoExterno;
} 