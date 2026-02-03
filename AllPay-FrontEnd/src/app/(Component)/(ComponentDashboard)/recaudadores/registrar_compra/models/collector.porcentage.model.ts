export interface PorcentajeCobro {
    id_porcentaje_cobro: number;
    cod_tipo_cobro: string;
    valor: string;
}

export interface PorcentajeCobroResponse {
    success: boolean;
    detail: string;
    data: PorcentajeCobro[];
} 