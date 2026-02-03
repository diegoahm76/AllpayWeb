export interface FacturaZipPayload {
    nros_factura: number[];
}

export interface FacturaZipData {
    facturas_encontradas: number[];
    archivo_zip: string;
    url_descarga: string;
}

export interface FacturaZipResponse {
    success: boolean;
    detail: string;
    facturas_encontradas: number[];
    archivo_zip: string;
    url_descarga: string;
}

