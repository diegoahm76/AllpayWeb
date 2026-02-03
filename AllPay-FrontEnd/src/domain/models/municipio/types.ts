export interface Municipio {
    cod_municipio: string;
    nombre: string;
}

export interface MunicipioColombiaResponse {
    success: boolean;
    detail: string;
    data: Municipio[];
} 

