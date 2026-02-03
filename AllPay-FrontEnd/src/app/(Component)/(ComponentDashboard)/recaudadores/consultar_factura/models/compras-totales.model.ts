export interface ComprasTotalesData {
    total_cuota_fomento: number;
    total_kilos: number;
    total_valor_bruto: number;
    total_intereses: number;
}

export interface ComprasTotalesResponse {
    success: boolean;
    detail: string;
    data: ComprasTotalesData;
}
