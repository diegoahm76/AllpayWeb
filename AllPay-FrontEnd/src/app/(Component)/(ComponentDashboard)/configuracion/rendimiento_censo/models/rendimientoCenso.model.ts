export interface RendimientoCenso {
    departamento: string;
    codigo_departamento: string;
    nombre_departamento: string;
    rendimiento_censo: string;
    fecha_actualizacion: string;
    usuario_actualizacion: number | null;
}

export interface EstadisticasRendimiento {
    total_departamentos: number;
    rendimiento_promedio: number;
    rendimiento_minimo: number;
    rendimiento_maximo: number;
}

export interface RendimientoCensoApiResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    data: RendimientoCenso[];
    estadisticas: EstadisticasRendimiento;
    detail: string;
}

export interface RendimientoCensoFilters {
    page?: number;
    page_size?: number;
}
