export interface MesesPronostico {
    ene: string;
    feb: string;
    mar: string;
    abr: string;
    may: string;
    jun: string;
    jul: string;
    ago: string;
    sep: string;
    oct: string;
    nov: string;
    dic: string;
}

export interface PronosticoAnual {
    anio: number;
    meses: MesesPronostico;
    produccion_anual: string; // Viene como string en la API
}

export interface ParametrosPronostico {
    anio_actual: number;
    periodos_estadisticos: number;
    rango_historico: [number, number];
}

export interface DataPronosticoLineal {
    pronostico_lineal: PronosticoAnual[];
}

export interface PronosticoLinealResponse {
    success: boolean;
    detail: string;
    parametros: ParametrosPronostico;
    data: DataPronosticoLineal;
}

export interface ParamsPronosticoLineal {
    anio_actual: number;
    periodos_estadisticos: number;
}
