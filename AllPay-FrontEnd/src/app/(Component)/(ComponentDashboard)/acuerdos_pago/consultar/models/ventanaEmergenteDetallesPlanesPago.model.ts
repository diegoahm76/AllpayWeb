export interface VentanaEmergenteDetallesPlanesPagoData {
    id_solicitud_acuerdo_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    documento_asociado: string;
    valor_total_facturas: number;
    estado_solicitud: string;
    observaciones: string;
    doc_acuerdo_plan_pago: string | null;
    doc_pago_liquidacion: string | null;
}

export interface VentanaEmergenteDetallesPlanesPagoResponse {
    success: boolean;
    detail: string;
    data: VentanaEmergenteDetallesPlanesPagoData;
} 