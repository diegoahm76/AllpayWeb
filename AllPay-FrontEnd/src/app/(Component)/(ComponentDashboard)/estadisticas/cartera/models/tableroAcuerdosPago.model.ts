export interface RegistroAcuerdoPago {
    no_documento_recaudador: string;
    razon_social: string;
    no_factura_unica: number;
    nit_proveedor: string;
    nombre_proveedor: string;
    municipio_procedencia_cacao: string;
    departamento_procedencia_cacao: string;
    kilos: number;
    precio_kilo: string;
    valor_bruto: string;
    valor_cuota_fomento: string;
    valor_neto: string;
    dias_mora: number;
    valor_intereses: string;
    estado_acuerdo_pago: string;
}

export interface TotalesAcuerdoPago {
    total_kilos: string;
    total_cuota_fomento: string;
    total_intereses: string;
}

export interface TableroAcuerdosPagoData {
    registros: RegistroAcuerdoPago[];
    totales: TotalesAcuerdoPago;
}

export interface TableroAcuerdosPagoResponse {
    success: boolean;
    count: number;
    total_pages: number;
    current_page: number;
    next?: string;
    previous?: string;
    data: {
        success: boolean;
        detail: string;
        data: TableroAcuerdosPagoData;
    };
}

export interface TableroAcuerdosPagoParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
    nombres?: string;
    correo_electronico?: string;
    tipo_documento?: string;
    page?: number;
    page_size?: number;
}
