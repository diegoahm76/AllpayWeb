// Modelo para un tipo de cargue individual (array de 2 elementos: código y descripción)
export type TipoCargue = [string, string];

// Modelo para la respuesta completa de la API
export interface TiposCargueResponse {
    success: boolean;
    detail: string;
    data: TipoCargue[];
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface TiposCargueMapped {
    success: boolean;
    tiposCargue: TipoCargue[];
    error?: string;
}

// Modelo para un tipo de cargue con estructura más clara (opcional)
export interface TipoCargueStructured {
    codigo: string;
    descripcion: string;
}

// Modelo para la respuesta mapeada con estructura más clara (opcional)
export interface TiposCargueStructuredMapped {
    success: boolean;
    tiposCargue: TipoCargueStructured[];
    error?: string;
} 