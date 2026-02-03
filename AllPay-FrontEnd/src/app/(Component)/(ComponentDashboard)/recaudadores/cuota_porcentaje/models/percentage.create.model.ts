export interface PercentageCreateData {
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    valor: string;
    fecha_actualizacion: string | null;
    id_persona_actualiza: number;
}

export interface PercentageCreateResponse {
    success: boolean;
    detail: string;
    data: PercentageCreateData;
}

export interface PercentageCreatePayload {
    cod_tipo_cobro: string;
    valor: number;
} 