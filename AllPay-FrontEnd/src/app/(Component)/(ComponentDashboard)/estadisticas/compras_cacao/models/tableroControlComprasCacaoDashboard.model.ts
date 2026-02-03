// Interfaces para el endpoint tablero-control-compras-cacao

export interface EstadoFactura {
    estado_factura: string;
    kilos: number;
    valor_bruto: number;
    cuota_fomento: number;
}

export interface CuotaDepartamento {
    id_departamento_cacao: string;
    valor_bruto: number;
    cuota_fomento: number;
    departamento_cacao: string;
}

export interface KiloMunicipio {
    id_municipio_cacao: string;
    total_kilos: number;
    cuota_fomento: number;
    municipio_cacao: string;
}

export interface TableroControlComprasCacaoDashboardData {
    tabla_estado: EstadoFactura[];
    tabla_cuota_departamento: CuotaDepartamento[];
    tabla_kilo_departamento: KiloMunicipio[];
}

// La respuesta del API NO viene envuelta en "data".
// Es del tipo { 
//   success: boolean, 
//   tabla_estado: [...], 
//   tabla_cuota_departamento: [...], 
//   tabla_kilo_departamento: [...] (ahora incluye datos de municipios)
// }
export interface TableroControlComprasCacaoDashboardResponse extends TableroControlComprasCacaoDashboardData {
    success: boolean;
}

export interface TableroControlComprasCacaoDashboardParams {
    fecha_inicio?: string;        // YYYY-MM-DD - Fecha de inicio (opcional)
    fecha_fin?: string;          // YYYY-MM-DD - Fecha de fin (opcional)
    estado?: string;             // Estado de la factura (opcional)
    id_departamento?: number;    // ID del departamento (opcional)
    id_municipio?: number;       // ID del municipio (opcional)
    id_recaudador?: number;      // ID del recaudador (opcional)
}
