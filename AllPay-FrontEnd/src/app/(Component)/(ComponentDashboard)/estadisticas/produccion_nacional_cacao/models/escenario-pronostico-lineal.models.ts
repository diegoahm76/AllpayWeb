export interface MesesEscenario {
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

export interface EscenarioAnual {
    anio: number;
    meses: MesesEscenario;
    produccion_anual: number;
}

export interface EstadisticasEscenario {
    total_anos: number;
    anos_historicos: number;
    anos_proyectados: number;
    promedio_produccion: number;
    tendencia_anual: number;
    anos_base_proyeccion: number[];
}

export interface ParametrosEscenario {
    anos_proyeccion: number;
    ano_base: number;
}

export interface DataEscenarioPronosticoLineal {
    escenario_pronostico_lineal: EscenarioAnual[];
    estadisticas: EstadisticasEscenario;
    parametros: ParametrosEscenario;
}

export interface EscenarioPronosticoLinealResponse {
    success: boolean;
    detail: string;
    data: DataEscenarioPronosticoLineal;
}

export interface ParamsEscenarioPronosticoLineal {
    anio_actual: number;
    periodos_estadisticos: number;
}
