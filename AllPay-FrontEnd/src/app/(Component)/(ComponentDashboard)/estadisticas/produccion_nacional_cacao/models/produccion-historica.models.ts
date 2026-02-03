export interface MesesProduccion {
    ene: number;
    feb: number;
    mar: number;
    abr: number;
    may: number;
    jun: number;
    jul: number;
    ago: number;
    sep: number;
    oct: number;
    nov: number;
    dic: number;
}

export interface ProduccionAnual {
    anio: number;
    meses: MesesProduccion;
    produccion_anual: number;
    variacion_pct?: number;
}

export interface ParametrosProduccionHistorica {
    anio_actual: number;
    año_proyeccion: number;
    periodos_estadisticos: number;
}

export interface DataProduccionHistorica {
    produccion_historica: ProduccionAnual[];
    parametros: ParametrosProduccionHistorica;
    variacion_promedio_pct: number;
}

export interface ProduccionHistoricaResponse {
    success: boolean;
    detail: string;
    data: DataProduccionHistorica;
}

export interface ParamsProduccionHistorica {
    ano_actual: number;
    periodos_estadisticos: number;
}
