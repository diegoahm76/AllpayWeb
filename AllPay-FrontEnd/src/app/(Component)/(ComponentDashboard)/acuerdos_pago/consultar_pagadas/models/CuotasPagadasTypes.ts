// Interfaces para la respuesta del endpoint consultar-cuotas-pagadas

export interface DocumentoCuotaPagada {
  id_documento_generado: number;
  documento_generado: string;
  comprobante_pago: string;
  archivo: string;
}

export interface RecaudadorCuotasPagadas {
  id_persona: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono_celular: string;
  fecha_nacimiento: string | null;
}

export interface CuotaPagada {
  id_solicitud_acuerdo_pago: number;
  nro_solicitud: number;
  id_plan_pago: number;
  nro_plan_pago: number;
  id_cuota_acuerdo_pago: number;
  nro_cuota: number;
  fecha_vencimiento: string;
  valor_cuota: number;
  pagada: boolean;
  fecha_pago: string | null;
  nro_doc_pago: string;
  documento: DocumentoCuotaPagada;
  recaudador: RecaudadorCuotasPagadas; // Cada cuota tiene su propio recaudador
}

export interface CuotasPagadasResponse {
  success: boolean;
  detail: string;
  cuotas_pagadas: CuotaPagada[];
  recaudador?: RecaudadorCuotasPagadas; // Opcional: para endpoints que tienen recaudador global
}

// Tipo para la respuesta completa de la API (endpoint interno)
export interface CuotasPagadasApiResponse {
  success: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: CuotasPagadasResponse;
}

// Tipo para la respuesta del endpoint externo (sin envolvente data)
export interface CuotasPagadasExternoResponse {
  success: boolean;
  detail: string;
  cuotas_pagadas: CuotaPagada[];
  recaudador: RecaudadorCuotasPagadas;
} 