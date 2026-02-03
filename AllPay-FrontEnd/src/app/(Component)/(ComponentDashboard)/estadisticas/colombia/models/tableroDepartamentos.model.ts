// Interfaces para el endpoint tablero9/departamentos/

export interface Departamento {
    codigo: string;
    nombre: string;
    total_kilos: number;
    total_cuota_fomento: number;
    total_valor_neto: number;
    total_valor_bruto: number;
}

export interface FiltrosAplicados {
    anio: number | null;
    mes: number | null;
    fecha_desde: string | null;
    fecha_hasta: string | null;
    orden: string;
}

// La respuesta del API viene con data como array directo y filtros_aplicados al mismo nivel
export interface TableroDepartamentosResponse {
    success: boolean;
    message: string;
    data: Departamento[];  // Array directo de departamentos
    filtros_aplicados: FiltrosAplicados;
}

// Para uso interno del hook, creamos esta interfaz
export interface TableroDepartamentosData {
    departamentos: Departamento[];
    filtros_aplicados: FiltrosAplicados;
}

export interface TableroDepartamentosParams {
    anio?: number;           // Año 
    mes?: number;            // Mes 
    fecha_desde?: string;    // Fecha desde YYYY-MM-DD 
    fecha_hasta?: string;    // Fecha hasta YYYY-MM-DD 
    orden?: string;          // Orden de los resultados 
}
