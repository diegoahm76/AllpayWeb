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

export interface SerieAnual {
    anio: number;
    meses: MesesProduccion;
    produccion_anual: number;
    variacion_pct: number;
}

export interface ProyeccionAnual {
    meses: MesesProduccion;
    produccion_anual: number;
}

export interface DistribucionMensual {
    meses: MesesProduccion;
    total: number;
}

export interface ParticipacionPorcentual {
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

export interface ParametrosSeriesAnuales {
    anio_actual: number;
    periodos_estadisticos: number;
}

export interface DataSeriesAnuales {
    series_anuales: SerieAnual[];
    variacion_promedio_pct: number;
    proyeccion: ProyeccionAnual;
    distribucion_mensual: DistribucionMensual;
    participacion_pct: ParticipacionPorcentual;
}

export interface SeriesAnualesResponse {
    success: boolean;
    detail: string;
    parametros: ParametrosSeriesAnuales;
    data: DataSeriesAnuales;
}

export interface ParamsSeriesAnuales {
    anio_actual: number;
    periodos_estadisticos: number;
}
