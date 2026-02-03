import axios, { AxiosError } from 'axios';
import { 
  PsePaymentRequest, 
  PsePaymentResponse, 
  ProcessedPsePaymentResponse 
} from '../models/PaymentTypes';
import { ZonaPagosRequest } from '../../generar/adapters/iniciarPagoZonaPagos';

// URL base de la API propia
const baseApiUrl = process.env.BASE_API_URL;

/**
 * Procesa un error de la API y devuelve un mensaje amigable
 * @param error - Error de Axios
 * @returns Mensaje de error
 */
const processApiError = (error: AxiosError): string => {
  const status = error.response?.status || 0;
  const errorData = error.response?.data as Record<string, any> | undefined;
  const errorDetail = errorData?.description || errorData?.error_code || error.message;
  
  switch (status) {
    case 400:
      if (errorData?.category === 'request') {
        return `Error en la solicitud de pago: ${errorDetail}`;
      }
      return `Datos incorrectos en la solicitud de pago: ${errorDetail}`;
    case 401:
      return `Error de autenticación con la pasarela de pago: ${errorDetail}. Por favor, verifique las credenciales.`;
    case 403:
      return 'No tiene permisos para realizar pagos. Por favor, contacte al administrador.';
    case 404:
      return 'El servicio de pagos PSE no está disponible en este momento.';
    case 409:
      return 'Esta transacción ya fue procesada anteriormente. El sistema generará automáticamente una nueva referencia para procesar su pago. Por favor, intente nuevamente.';
    case 422:
      return `Error de validación: ${errorDetail}. Por favor, verifique los datos ingresados.`;
    case 500:
    case 502:
    case 503:
    case 504:
      if (status === 503) {
        return 'El servicio de pagos PSE de OpenPay está temporalmente no disponible. Esto es un problema del proveedor, no de la aplicación. Por favor, intente nuevamente en unos minutos.';
      }
      return 'Error en el servidor de la pasarela de pago. Por favor, intente más tarde.';
    default:
      return `Error al procesar el pago: ${errorDetail}`;
  }
};

/**
 * Genera un ID de orden único basado en timestamp y un número aleatorio
 * @returns ID de orden único
 */
export const generateOrderId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 999999); // Aumentar rango aleatorio
  const microtime = performance.now().toString().replace('.', ''); // Agregar microtime para mayor unicidad
  return `FEDECACAO-${timestamp}-${random}-${microtime.slice(-6)}`;
};

/**
 * Calcula el IVA basado en un monto y porcentaje
 * @param amount - Monto total
 * @param percentage - Porcentaje de IVA (por defecto 19%)
 * @returns Valor del IVA como string
 */
export const calculateIVA = (amount: number, percentage: number = 19): string => {
  const iva = Math.round(amount * percentage / 119); // El monto ya incluye IVA
  return iva.toString();
};

/**
 * Crear / iniciar un pago PSE a través de la API propia
 * 
 * @param paymentData - Datos originales del pago PSE (se usan para construir el payload requerido)
 * @param token - Token JWT para autorización adicional (no requerido por ahora)
 * @param retryCount - Número de reintentos en caso de error (default: 0)
 * @returns Respuesta procesada con `success`, `error` y `redirectUrl`
 */
export const createPsePayment = async (
  paymentData: PsePaymentRequest,
  _token?: string,
  _retryCount: number = 0
): Promise<ProcessedPsePaymentResponse> => {
  try {

    // Intentar obtener id_liquidacion desde sessionStorage (pse_payment_data)
    let id_liquidacion = 0;
    if (typeof window !== 'undefined') {
      try {
        const storedPaymentData = sessionStorage.getItem('pse_payment_data');
        if (storedPaymentData) {
          const parsed = JSON.parse(storedPaymentData);
          if (parsed.id_liq_factura_unica || parsed.id_liquidacion) {
            id_liquidacion = Number(parsed.id_liq_factura_unica || parsed.id_liquidacion) || 0;
          }
        }
      } catch (e) {
        console.warn('[createPsePayment] - No se pudo leer id_liquidacion desde sessionStorage:', e);
      }
    }

    const iniciarPagoPayload: ZonaPagosRequest = {
      id_liquidacion,
      numero_documento: paymentData.capture?.document?.document_number || '',
      tipo_documento: paymentData.capture?.document?.document_type || '',
      primer_nombre: paymentData.customer?.name || '',
      primer_apellido: paymentData.customer?.last_name || '',
      email: paymentData.customer?.email || '',
      telefono: paymentData.customer?.phone_number || ''
    };

    console.log('[createPsePayment] - Payload enviado a iniciar-pago:', iniciarPagoPayload);

    const url = `${baseApiUrl}recaudos/pagos/iniciar-pago/`;

    const startTime = Date.now();
    
    type IniciarPagoResponse = {
      success: boolean;
      redirect_url?: string;
      identificador?: string;
      id_pago?: number;
      detail?: string;
    };

    const response = await axios.post<IniciarPagoResponse>(url, iniciarPagoPayload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const endTime = Date.now();
    console.log(`[createPsePayment] - ⌛ Petición completada en ${endTime - startTime}ms`);
    console.log(`[createPsePayment] - Código de estado HTTP: ${response.status}`);
    
    console.log('[createPsePayment] - Respuesta recibida de iniciar-pago:', response.data);
    
    // Verificar si la respuesta es exitosa y tiene URL de redirección
    if (response.status >= 200 && response.status < 300 && response.data.success && response.data.redirect_url) {
      const pseudoResponse: PsePaymentResponse = {
        id: String(response.data.id_pago || response.data.identificador || ''),
        payment_method: {
          type: 'redirect',
          url: response.data.redirect_url
        }
      };

      console.log('[createPsePayment] - ✅ Pago iniciado correctamente. URL de redirección recibida.');

      return {
        success: true,
        data: pseudoResponse,
        redirectUrl: response.data.redirect_url
      };
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      console.log('[createPsePayment] - ⚠️ Respuesta recibida pero sin URL de redirección válida', response.data);
      return {
        success: false,
        error: response.data.detail || 'Error al iniciar el pago PSE'
      };
    }
  } catch (error) {
    console.error('[createPsePayment] - ❌ Error en la petición:', error);
    
    // Mostrar detalles del error si es de Axios
    if (axios.isAxiosError(error)) {
      console.error(`[createPsePayment] - Código de error: ${error.code}`);
      console.error(`[createPsePayment] - Mensaje: ${error.message}`);
      
      if (error.response) {
        console.error(`[createPsePayment] - Estado HTTP: ${error.response.status}`);
        console.error(`[createPsePayment] - Datos de respuesta:`, error.response.data);
        console.error(`[createPsePayment] - Cabeceras:`, error.response.headers);
      } else if (error.request) {
        console.error(`[createPsePayment] - No se recibió respuesta. Detalles de la solicitud:`, error.request);
      }
      
      const errorMessage = processApiError(error);
      console.error(`[createPsePayment] - Mensaje de error procesado: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    // Error genérico
    console.error(`[createPsePayment] - Error genérico: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el pago PSE'
    };
  }
}; 