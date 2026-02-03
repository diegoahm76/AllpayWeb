export interface DetallePlanPago {
    nro_solicitud: number;
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    nombre_recaudador: string;
    fecha_solicitud: string;
    estado: string;
    id_plan_pago: number;
    numero_plan_pago: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    numero_cuota: number;
    fecha_pago: string | null;
    Nro_factura: number;
    cuota_fomento: number;
    valor_factura: number;
}

export interface DetallePlanPagoResponse {
    success: boolean;
    detail: string;
    total_pages: number;
    data: DetallePlanPago[];
} 