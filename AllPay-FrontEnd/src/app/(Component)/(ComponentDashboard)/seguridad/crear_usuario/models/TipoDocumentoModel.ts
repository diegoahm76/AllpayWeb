export interface TipoDocumento {
    cod_tipo_documento: string;
    nombre: string;
}

export interface TipoDocumentoResponse {
    success: boolean;
    detail: string;
    data: TipoDocumento[];
} 