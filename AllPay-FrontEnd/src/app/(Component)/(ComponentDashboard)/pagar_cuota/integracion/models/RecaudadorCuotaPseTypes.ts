// Interfaces para la respuesta del endpoint info-recaudador-cuota-pse

export interface RecaudadorInfo {
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface FacturaCuotaPse {
  id_solicitud: number;
  id_plan_pago: number;
  nro_solicitud: number;
  nro_cuota: number;
  nro_plan_pago: number;
  nro_doc_pago: string;
  cuota_fomento: number;
  dias_mora: number;
  intereses: number;
  valor_total_factura: number;
  nro_factura_unica: number;
}

export interface RecaudadorCuotaPseResponse {
  success: boolean;
  recaudador: RecaudadorInfo;
  facturas: FacturaCuotaPse[];
  valor_total: number;
  dias_mora_max: number;
} 