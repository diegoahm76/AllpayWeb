export interface PorcentajeCobro {
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    valor: string;
    fecha_actualizacion: string;
    id_persona_actualiza: number;
}

export interface PorcentajeCobroResponse {
    success: boolean;
    detail: string;
    data: PorcentajeCobro[];
}
