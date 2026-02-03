export interface FechaCierre {
    id_fecha_cierre: number;
    cod_tipo_cobro_fecha: string;
    cod_tipo_cobro_fecha_display: string;
    dias_registro_compra: number;
    dias_pago: number;
    dias_pago_interes: number;
}

export interface FechasCierreResponse {
    success: boolean;
    detail: string;
    data: FechaCierre[];
} 