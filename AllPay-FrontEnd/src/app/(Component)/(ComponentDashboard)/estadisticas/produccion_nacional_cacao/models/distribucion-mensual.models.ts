// Interfaz para los meses con valores string (como vienen del API)
export interface MesesData {
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
    total?: string;
}

// Interfaz para participación porcentual
export interface ParticipacionPct {
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
    total: number;
}

// Interfaz para proyección
export interface ProyeccionData {
    anio: number;
    meses: MesesData;
    produccion_anual: string;
}

// Interfaz para distribución mensual
export interface DistribucionMensualData {
    total(total: any): unknown;
    meses: MesesData;
}

// Interfaz para parámetros del endpoint
export interface ParametrosData {
    anio_actual: number;
    año_proyeccion: number;
    periodos_estadisticos: number;
}

// Interfaz principal de datos
export interface DataDistribucionMensual {
    proyeccion: ProyeccionData;
    toneladas: DistribucionMensualData;
    parametros: ParametrosData;
    participacion_pct: ParticipacionPct;
}

export interface DistribucionMensualResponse {
    success: boolean;
    detail: string;
    ano_consultado: number;
    data: DataDistribucionMensual;
}

export interface ParamsDistribucionMensual {
    anio_actual: number;
    periodos_estadisticos: number;
}
