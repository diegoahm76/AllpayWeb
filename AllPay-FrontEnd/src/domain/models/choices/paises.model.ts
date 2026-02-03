// Modelo para un país individual
export interface Pais {
    cod_pais: string;
    nombre: string;
}

// Modelo para la respuesta completa de la API
export interface PaisesResponse {
    success: boolean;
    detail: string;
    data: Pais[];
}

// Modelo para la respuesta mapeada que usaremos en el hook
export interface PaisesMapped {
    success: boolean;
    paises: Pais[];
    detail: string;
    error?: string;
}

// Tipo para las opciones del select
export interface PaisSelectOption {
    key: string;
    value: string;
    title: string;
}
