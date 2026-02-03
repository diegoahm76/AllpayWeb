export interface UpdateDatePayload {
    dias_registro_compra: number;
    dias_pago: number;
    dias_pago_interes: number;
}

export interface UpdateDateResponse {
    success: boolean;
    detail: string;
    data: {
        cod_tipo_cobro_fecha: string;
        dias_registro_compra: number;
        dias_pago: number;
        dias_pago_interes: number;
    };
} 