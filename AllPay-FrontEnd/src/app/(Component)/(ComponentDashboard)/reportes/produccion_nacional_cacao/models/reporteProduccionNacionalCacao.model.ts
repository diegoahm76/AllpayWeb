// Modelo para los datos de consolidado por departamento/municipio
export interface ConsolidadoProduccion {
    departamento: string;
    municipio: string;
    enero_total_kilos: number;
    enero_total_toneladas: string;
    enero_total_cuota_fomento: number;
    febrero_total_kilos: number;
    febrero_total_toneladas: string;
    febrero_total_cuota_fomento: number;
    marzo_total_kilos: number;
    marzo_total_toneladas: string;
    marzo_total_cuota_fomento: number;
    abril_total_kilos: number;
    abril_total_toneladas: string;
    abril_total_cuota_fomento: number;
    mayo_total_kilos: number;
    mayo_total_toneladas: string;
    mayo_total_cuota_fomento: number;
    junio_total_kilos: number;
    junio_total_toneladas: string;
    junio_total_cuota_fomento: number;
    julio_total_kilos: number;
    julio_total_toneladas: string;
    julio_total_cuota_fomento: number;
    agosto_total_kilos: number;
    agosto_total_toneladas: string;
    agosto_total_cuota_fomento: number;
    septiembre_total_kilos: number;
    septiembre_total_toneladas: string;
    septiembre_total_cuota_fomento: number;
    octubre_total_kilos: number;
    octubre_total_toneladas: string;
    octubre_total_cuota_fomento: number;
    noviembre_total_kilos: number;
    noviembre_total_toneladas: string;
    noviembre_total_cuota_fomento: number;
    diciembre_total_kilos: number;
    diciembre_total_toneladas: string;
    diciembre_total_cuota_fomento: number;
    total_kilos_anual: number;
    total_toneladas_anual: string;
    total_cuota_fomento_anual: number;
}

// Modelo para los totales por mes
export interface TotalesPorMes {
    enero: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    febrero: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    marzo: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    abril: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    mayo: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    junio: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    julio: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    agosto: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    septiembre: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    octubre: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    noviembre: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
    diciembre: {
        total_kilos: number;
        total_cuota_fomento: number;
        total_toneladas: number;
    };
}

// Modelo para los datos internos de la respuesta
export interface DatosReporteProduccion {
    consolidado: ConsolidadoProduccion[];
    totales_por_mes: TotalesPorMes;
}

// Modelo para la respuesta completa de la API
export interface ReporteProduccionNacionalCacaoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: {
        success: boolean;
        count: number;
        data: DatosReporteProduccion;
    };
}

// Modelo para los parámetros de consulta
export interface ReporteProduccionNacionalCacaoParams {
    // Parámetros de paginación
    page?: number;
    page_size?: number;
    // Parámetros de filtro por fecha
    fecha_inicio?: string;
    fecha_final?: string;
    // Parámetros de filtro por ubicación
    id_departamento_cacao?: string;
    id_municipio_cacao?: string;
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteProduccionNacionalCacaoMapped {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    consolidado: ConsolidadoProduccion[];
    totales_por_mes: TotalesPorMes;
    error?: string;
} 