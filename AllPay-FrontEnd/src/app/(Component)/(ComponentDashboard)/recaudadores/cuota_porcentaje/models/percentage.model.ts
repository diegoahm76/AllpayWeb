export interface PercentageData {
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    valor: string;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

export interface PercentageResponse {
    success: boolean;
    detail: string;
    data: {
        id_porcentaje_cobro: number;
        cod_tipo_cobro_display: string;
        cod_tipo_cobro: string;
        valor: string;
        fecha_actualizacion: string;
        id_persona_actualiza: number;
    };
}

export interface UpdatePercentagePayload {
    valor: string;
} 