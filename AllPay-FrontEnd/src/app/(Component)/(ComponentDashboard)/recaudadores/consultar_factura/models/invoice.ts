export interface Invoice {
    id_factura: number;
    numero_factura: string;
    fecha_registro: string;
    fecha_compra: string;
    nit_proveedor: string;
    nombre_proveedor: string;
    departamento: string;
    municipio: string;
    total_kilos: number;
    cuota_fomento: number;
}

export interface InvoiceResponse {
    detail: string;
    success: boolean;
    data: Invoice[];
} 