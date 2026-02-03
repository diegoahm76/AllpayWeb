export interface SolicitudAcuerdoPagoData {
    id_solicitud: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    valor_total_pagar: number;
    facturas_asociadas: number[];
}

export interface SolicitudAcuerdoPagoResponse {
    success: boolean;
    detail: string;
    data: SolicitudAcuerdoPagoData;
}

export interface SolicitudAcuerdoPagoPreviewData {
    nro_solicitud: number;
    fecha_solicitud: string;
    valor_total_pagar: number;
    estado: string;
    facturas_seleccionadas: number[];
}

export interface SolicitudAcuerdoPagoPreviewResponse {
    success: boolean;
    detail: string;
    data: SolicitudAcuerdoPagoPreviewData;
} 