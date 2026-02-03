// Interfaces para el endpoint tablero9/municipios-por-departamento/

export interface Municipio {
    codigo: string;
    nombre: string;
    department_code: string;
    department_name: string;
    total_kilos: number;
    total_cuota_fomento: number;
    total_valor_neto: number;
    total_valor_bruto: number;
}

export interface DepartamentoInfo {
    codigo: string;
    nombre: string;
}

export interface FiltrosMunicipios {
    codigo_departamento: string;
    anio: number | null;
    mes: number | null;
    fecha_desde: string | null;
    fecha_hasta: string | null;
    orden: string;
}

// La respuesta del API viene con data como array directo y filtros_aplicados al mismo nivel
export interface TableroMunicipiosResponse {
    success: boolean;
    message: string;
    data: Municipio[];  // Array directo de municipios
    departamento: DepartamentoInfo;
    filtros_aplicados: FiltrosMunicipios;
}

// Para uso interno del hook, creamos esta interfaz
export interface TableroMunicipiosData {
    municipios: Municipio[];
    departamento: DepartamentoInfo;
    filtros_aplicados: FiltrosMunicipios;
}

export interface TableroMunicipiosParams {
    codigo_departamento: string;  // Código del departamento (requerido)
    anio?: number;                // Año 
    mes?: number;                 // Mes 
    fecha_desde?: string;         // Fecha desde YYYY-MM-DD 
    fecha_hasta?: string;         // Fecha hasta YYYY-MM-DD 
    orden?: string;               // Orden de los resultados 
}
