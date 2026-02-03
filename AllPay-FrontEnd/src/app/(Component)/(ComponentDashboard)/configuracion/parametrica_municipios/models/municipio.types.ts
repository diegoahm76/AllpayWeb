export interface Municipio {
    cod_municipio: string;
    nombre: string;
    cod_departamento: string;
    nombre_departamento: string;
    cod_departamento_nombre: string;
    es_cacaotero: boolean;
}

export interface MunicipioResponse {
    success: boolean;
    detail: string;
    data: Municipio[];
    count: number;
    total_pages: number;
    current_page: number;
    next: string | null;
    previous: string | null;
}
