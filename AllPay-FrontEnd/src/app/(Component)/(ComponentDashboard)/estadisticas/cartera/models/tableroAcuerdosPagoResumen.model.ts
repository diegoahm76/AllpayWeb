export interface TotalesResumenAcuerdosPago {
    totalKilos: number;
    totalCuotaFomento: number;
    totalInteres: number;
}

export interface DetalleResumenAcuerdosPago {
    estado: string;
    valorIntereses: number;
    valorCuotaFomento: number;
    diasMora: number;
}

export interface TableroAcuerdosPagoResumenData {
    totales: TotalesResumenAcuerdosPago;
    detalles: DetalleResumenAcuerdosPago[];
}

export interface TableroAcuerdosPagoResumenResponse {
    success: boolean;
    detail: string;
    data: TableroAcuerdosPagoResumenData;
}

export interface TableroAcuerdosPagoResumenParams {
    fecha_inicio?: string;
    fecha_fin?: string;
    numero_documento?: string;
}
