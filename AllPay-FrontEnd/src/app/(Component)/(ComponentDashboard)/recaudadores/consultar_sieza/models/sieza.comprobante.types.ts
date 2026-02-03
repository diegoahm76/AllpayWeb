// Tipos para el endpoint de comprobante SIEZA
export interface SiezaComprobanteInicial {
  COMPAÑIA: string;
}

export interface SiezaComprobanteDocumentoContable {
  COMPAÑIA: string;
  CONSECUTIVO: string;
  "FECHA DOCUMENTO": string;
  TERCERO: string;
  OBSERVACIONES: string;
}

export interface SiezaComprobanteMovimientoContable {
  COMPAÑIA: string;
  "TIPO DE DOCUMENTO": string;
  "Numero de documento": string;
  "Auxiliar de cuenta contable": string;
  Tercero: string;
  "Centro de operación del movimiento": string;
  "Unidad de negocio": string;
  "Valor debito": number | null | undefined;
  "Valor crédito": number | null | undefined;
  "Valor debito libro 2": number | null | undefined;
  "Valor crédito libro 2": number | null | undefined;
  "Valor debito libro 3": number | null | undefined;
  "Valor crédito libro 3": number | null | undefined;
  mes_pago?: string;
}

export interface SiezaComprobanteMovimientoCxC {
  "Compañía": string;
  "Centro de operación del documento": string;
  "Tipo de documento": string;
  "Numero de documento 00": string;
  "Auxiliar de cuenta contable": string;
  Tercero: string;
  "Centro de operación del movimiento": string;
  "Unidad de negocio": string;
  "Valor debito": number | null | undefined;
  "Valor crédito": number | null | undefined;
  "Valor debito libro 2": number | null | undefined;
  "Valor crédito libro 2": number | null | undefined;
  "Observaciones del movimiento": string;
  "Sucursal cliente": string;
  "Numero de documento de cruce": string;
  "Fecha de vencimiento del documento": string;
  "Fecha de pronto pago del documento": string;
  "Tercero vendedor": string;
  "Fecha del documento de cruce": string;
  "Fecha de radicacion": string;
  mes_recaudo?: string;
}

export interface SiezaComprobanteFinal {
  "Compañía": string;
}

export interface SiezaComprobanteResponse {
  success: boolean;
  Inicial: SiezaComprobanteInicial;
  DocumentoContable: SiezaComprobanteDocumentoContable[];
  Movimientocontable: SiezaComprobanteMovimientoContable[];
  MovimientoCxC: SiezaComprobanteMovimientoCxC[];
  Final: SiezaComprobanteFinal;
}

// Parámetros para la consulta (si es necesario)
export interface GetSiezaComprobanteParams {
  fecha_inicio?: string;      // YYYY-MM-DD
  fecha_fin?: string;          // YYYY-MM-DD
  factura_unica?: string | number;
  municipio?: string;
  departamento?: string;
  numero_documento?: string;
  tipo_documento?: string;
}
