export interface RecaudadorInfo {
    nombre: string;
    numero_documento: string;
}

export interface AcuerdoPagoInternoData {
    id_solicitud_acuerdo_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    estado_plan_pago_display?: string;
    valor_total_pagar: number;
    observaciones: string;
    recaudador: RecaudadorInfo;
}

export interface AcuerdoPagoInternoResults {
    success: boolean;
    detail: string;
    data: AcuerdoPagoInternoData[];
}

// Modelo actualizado para coincidir con la respuesta real de la API
export interface ConsultaAcuerdoPagoInternoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: AcuerdoPagoInternoResults;
} 