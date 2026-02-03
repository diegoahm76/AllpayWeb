export interface TablaMes {
    total_toneladas_neto: number;
    mes: string;
    porcentaje: number;
}

export interface TablaPosicion {
    pos: string;
    total_toneladas_neto: number;
    porcentaje: number;
}

export interface TablaContinente {
    continente: string;
    total_toneladas_neto: number;
    porcentaje: number;
}

export interface TablaVia {
    via: string;
    total_toneladas_neto: number;
    porcentaje: number;
}

export interface DataAgnoComparativo {
    total_toneladas: string;
    tabla_meses: TablaMes[];
    tabla_posicion: TablaPosicion[];
    tabla_continente: TablaContinente[];
    tabla_via: TablaVia[];
}

export interface TableroControlSicexMesData {
    total_toneladas: string;
    tabla_meses: TablaMes[];
    tabla_posicion: TablaPosicion[];
    tabla_continente: TablaContinente[];
    tabla_via: TablaVia[];
    data_agno_comparativo?: DataAgnoComparativo;
}

export interface TableroControlSicexMesResponse {
    success: boolean;
    detail: string;
    data: TableroControlSicexMesData;
}

export interface TableroControlSicexMesParams {
    fecha_inicio: string;
    fecha_fin: string;
    tipo_cargue: string;
    posicion?: string;
    aduana_embarque?: string;
    continente?: string;
    via?: string;
    pais?: string;
    empresa?: string;
    comparativo_agno?: string;
} 