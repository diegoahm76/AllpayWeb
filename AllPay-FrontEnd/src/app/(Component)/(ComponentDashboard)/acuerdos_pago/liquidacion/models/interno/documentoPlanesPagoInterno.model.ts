export interface RecaudadorInfo {
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    nombre_recaudador: string;
    direccion_recaudador: string;
    telefono_recaudador: string;
}

export interface DetallePlanPago {
    id_solicitud: number;
    id_plan_pago: number;
    id_detalle_acuerdo_pago: number;
    id_cuota_acuerdo_pago: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    numero_plan_pago: number;
    numero_cuota: number;
    estado_plan_pago: string;
    estado_plan_pago_display: string;
    fecha_pago: string;
    Nro_factura: number;
    cuota_fomento: number;
    valor_factura: number;
}

export interface ValorTotal {
    valor_a_pagar: number;
}

export interface DocumentoPlanesPagoResponse {
    success: boolean;
    detail: string;
    recaudador: RecaudadorInfo;
    detalle_plan_pago: DetallePlanPago[];
    valor_total: ValorTotal;
} 