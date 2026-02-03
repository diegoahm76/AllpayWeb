export interface MunicipioCacaotero {
    cod_municipio: string;
    nombre: string;
    es_cacaotero: boolean;
}

export interface MunicipioCacaoteroResponse {
    success: boolean;
    detail: string;
    data: MunicipioCacaotero[];
} 