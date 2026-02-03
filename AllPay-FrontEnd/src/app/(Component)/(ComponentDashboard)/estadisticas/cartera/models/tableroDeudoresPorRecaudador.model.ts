export interface DeudorPorRecaudador {
    recaudador: string;
    intereses: number;
    cuotaFomento: number;
}

export interface TableroDeudoresPorRecaudadorData {
    deudoresPorRecaudador: DeudorPorRecaudador[];
}

export interface TableroDeudoresPorRecaudadorResponse {
    success: boolean;
    detail: string;
    data: TableroDeudoresPorRecaudadorData;
}

export interface TableroDeudoresPorRecaudadorParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
}
