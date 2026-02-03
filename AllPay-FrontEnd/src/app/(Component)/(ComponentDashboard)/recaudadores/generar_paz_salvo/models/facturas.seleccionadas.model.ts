export interface FacturaSeleccionada {
    id_factura_unica: number;
    fecha_creacion: string;
    nro_factura_unica: number;
    nombre_departamento: string;
    nombre_municipio: string;
    nit_proveedor: string;
    fecha_compra: string;
    total_kilos: number;
    total_kilos_certificados: number;
    precio_kilo: number;
    cuota_fomento: string;
    fecha_pago: string;
    kilos_paz_y_salvo: number;
    id_persona_proveedor: number;
}

export interface FacturaSeleccionadaResponse {
    success: boolean;
    detail: string;
    data: FacturaSeleccionada[];
} 