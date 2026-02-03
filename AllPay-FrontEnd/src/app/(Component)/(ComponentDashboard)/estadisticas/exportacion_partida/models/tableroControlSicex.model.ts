export interface TablaPais {
    pais: string;
    total_toneladas_neto: number;
    porcentaje: number;
}

export interface TablaEmpresa {
    empresa_declarante: string;
    total_toneladas_neto: number;
    porcentaje: number;
}

export interface DataAgnoComparativo {
    total_toneladas: string;
    tabla_pais: TablaPais[];
    tabla_empresa: TablaEmpresa[];
}

export interface TableroControlSicexData {
    total_toneladas: string;
    tabla_pais: TablaPais[];
    tabla_empresa: TablaEmpresa[];
    data_agno_comparativo?: DataAgnoComparativo;
}

export interface TableroControlSicexResponse {
    success: boolean;
    detail: string;
    data: TableroControlSicexData;
}

export interface TableroControlSicexParams {
    fecha_inicio: string;
    fecha_fin: string;
    tipo_cargue: string;
    posicion?: string;
    aduana_embarque?: string;
    continente?: string;
    via?: string;
    comparativo_agno?: string;
    pais?: string;
    empresa?: string;
}
