// Modelo para un registro individual del reporte SICEX
export interface RegistroSicex {
    id_cargue_sicex: number;
    cod_tipo_cargue: string;
    agno: string;
    aduana_embarque: string;
    auto_embarque: string;
    ciudad_ingreso: string;
    consecutivo_sicex: number;
    continente: string;
    departamento: string | null;
    descripcion_arancel: string;
    empresa_declarante: string;
    empresa_operadora: string;
    factor_conversion: string;
    fecha: string;
    fecha_cargue: string;
    id_persona_cargue: number;
    mes: string;
    nit: string;
    nro_declaracion: string;
    pais: string;
    pos: string;
    posicion: string;
    proveedor: string;
    total_peso_bruto: string;
    total_peso_neto: string;
    total_toneladas_bruto: string;
    total_toneladas_neto: string;
    total_valor_cif: string;
    total_valor_fob: string;
    via: string;
}

// Modelo para los datos internos de la respuesta
export interface DatosSicex {
    cargue_sicex: RegistroSicex[];
    total_peso: string;
    total_toneladas: string;
    total_valor_cif: string;
    total_valor_fob: string;
}

// Modelo para la respuesta completa de la API
export interface ReporteSicexResponse {
    success: boolean;
    count?: number;
    total_pages?: number;
    current_page?: number;
    next?: string | null;
    previous?: string | null;
    data?: DatosSicex;
    detail?: string; // Campo para mensajes cuando success es false
}

// Modelo para los parámetros de consulta
export interface ReporteSicexParams {
    // Parámetros obligatorios de paginación
    page: number;
    page_size: number;
    
    // Parámetros opcionales de filtro
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_cargue?: string;
    pais?: string; // Nombre del país para filtrar
    posicion?: string; // Posición arancelaria para filtrar
    via?: string; // Vía de transporte para filtrar
    empresa_declarante?: string; // Empresa declarante para filtrar
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface ReporteSicexMapped {
    success: boolean;
    registros: RegistroSicex[];
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
    // Totales calculados
    total_peso: string;
    total_toneladas: string;
    total_valor_cif: string;
    total_valor_fob: string;
    error?: string;
} 