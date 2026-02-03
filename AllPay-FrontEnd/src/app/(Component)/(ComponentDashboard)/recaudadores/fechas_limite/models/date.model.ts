export interface DateData {
    id_fecha_cierre: number;
    cod_tipo_cobro_fecha_display: string;
    cod_tipo_cobro_fecha: string;
    dias_registro_compra: number;
    dias_pago: number;
    dias_pago_interes: number;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

export interface DateResponse {
    success: boolean;
    detail: string;
    data: DateData[];
}

export interface CreateDatePayload {
    cod_tipo_cobro_fecha: string;
    dias_registro_compra: number;
    dias_pago: number;
    dias_pago_interes: number;
} 