/**
 * Utilidades para generar y manejar URLs de comprobante PSE
 */

export interface ComprobanteUrlParams {
  orderId: string;
  amount: number;
  customerName: string;
  email: string;
  description: string;
  id?: string; // Código de pago realizado de OpenPay
}

/**
 * Generar URL completa para el comprobante PSE
 */
export const generateComprobanteUrl = (
  baseUrl: string,
  params: ComprobanteUrlParams
): string => {
  const urlParams = new URLSearchParams({
    orderId: params.orderId,
    amount: params.amount.toString(),
    customerName: encodeURIComponent(params.customerName),
    email: encodeURIComponent(params.email),
    description: encodeURIComponent(params.description)
  });

  // Agregar el id si está disponible
  if (params.id) {
    urlParams.set('id', params.id);
  }

  return `${baseUrl}/PSE/comprobante?${urlParams.toString()}`;
};

/**
 * Parsear parámetros de URL del comprobante
 */
export const parseComprobanteParams = (searchParams: URLSearchParams): Partial<ComprobanteUrlParams> => {
  return {
    orderId: searchParams.get('orderId') || undefined,
    amount: searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : undefined,
    customerName: searchParams.get('customerName') ? decodeURIComponent(searchParams.get('customerName')!) : undefined,
    email: searchParams.get('email') ? decodeURIComponent(searchParams.get('email')!) : undefined,
    description: searchParams.get('description') ? decodeURIComponent(searchParams.get('description')!) : undefined,
    id: searchParams.get('id') || undefined
  };
};

/**
 * Validar que los parámetros mínimos estén presentes
 */
export const validateComprobanteParams = (params: Partial<ComprobanteUrlParams>): boolean => {
  return !!(params.orderId && params.amount);
};

/**
 * Obtener código de pago desde parámetros URL (con fallbacks legacy)
 */
export const getCodigoPagoFromParams = (searchParams: URLSearchParams): string => {
  // Prioridad: id (código real de OpenPay) → orderId → reference legacy → cod_pago_realizado legacy
  return searchParams.get('id') || 
         searchParams.get('orderId') || 
         searchParams.get('reference') || 
         searchParams.get('cod_pago_realizado') || 
         '';
}; 