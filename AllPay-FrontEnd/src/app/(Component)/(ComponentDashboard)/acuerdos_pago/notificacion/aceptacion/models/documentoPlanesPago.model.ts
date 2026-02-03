export interface DocumentoPlanesPagoResponse {
    success: boolean;
    detail: string;
    recaudador: RecaudadorInfo;
    detalle_plan_pago: DetallePlanPago[];
    valor_total: ValorTotal;
}

export interface RecaudadorInfo {
    tipo_documento_recaudador: string;
    numero_documento_recaudador: string;
    nombre_recaudador: string;
    direccion_recaudador: string;
    telefono_recaudador: string;
}

export interface DetallePlanPago {
    id_solicitud: number;
    nro_solicitud: number;
    fecha_solicitud: string;
    estado: string;
    numero_plan_pago: number;
    numero_cuota: number;
    fecha_pago: string;
    Nro_factura: number;
    cuota_fomento: number;
    valor_factura: number;
}

export interface ValorTotal {
    valor_a_pagar: number;
} 