export interface FacturaPorSolicitudItem {
    id_factura_unica: number;
    nro_factura_unica: number;
    fecha_compra: string;
    cuota_fomento: number;
    valor_bruto: number;
    total_kilos: number;
    dias_mora: number;
    fecha_limite_pago: string;
    intereses: number;
    valor_factura: number;
}

export interface FacturasPorSolicitudResponse {
    success: boolean;
    detail: string;
    data: FacturaPorSolicitudItem[];
} 