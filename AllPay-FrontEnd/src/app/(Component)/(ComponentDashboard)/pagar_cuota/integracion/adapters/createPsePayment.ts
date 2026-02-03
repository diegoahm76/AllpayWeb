import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { 
  PsePaymentRequest, 
  PsePaymentResponse, 
  ProcessedPsePaymentResponse 
} from '../models/PaymentTypes';

// Obtener credenciales desde variables de entorno
const getApiKey = (): string => {
  // Usar API_KEY directamente como se menciona en el error
  const apiKey = process.env.API_KEY || 'sk_e7ee1f2db2b348fdb1a3c1e2464477e3';
  if (!apiKey) {
    console.warn('[getApiKey] - ⚠️ No se ha configurado API_KEY en las variables de entorno');
  }
  console.log('[getApiKey] - API Key utilizada (primeros 4 caracteres):', apiKey.substring(0, 4) + '...');
  return apiKey;
};

const getMerchantId = (): string => {
  // Usar el merchant ID que funciona en Postman según el usuario
  const merchantId = process.env.MERCHANT_ID;
  if (!process.env.MERCHANT_ID) {
    console.warn('[getMerchantId] - ⚠️ Usando Merchant ID por defecto para sandbox');
  }
  console.log('[getMerchantId] - Merchant ID utilizado:', merchantId);
  return merchantId || '';
};

/**
 * Configura los headers de la petición con autenticación básica
 * @param token - Token JWT para autorización adicional (opcional)
 * @returns Configuración para la petición Axios
 */
const getRequestConfig = (token?: string): AxiosRequestConfig => {
  // Crear un string de autenticación básica con la clave de API como usuario y cadena vacía como contraseña
  const apiKey = getApiKey();
  const authString = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  
  console.log('[getRequestConfig] - Auth string (primeros 20 caracteres):', authString.substring(0, 20) + '...');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': authString
  };
  
  // Si se proporciona un token JWT, agregarlo como cabecera adicional
  if (token) {
    headers['X-Auth-Token'] = `Bearer ${token}`;
  }
  
  return {
    headers,
    timeout: 30000 // 30 segundos de timeout para operaciones de pago
  };
};

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
 * Crear un pago PSE a través de OpenPay
 * @param paymentData - Datos para el pago PSE
 * @param token - Token JWT para autorización adicional (opcional)
 * @param retryCount - Número de reintentos en caso de error (default: 0)
 * @returns Respuesta del pago PSE procesada
 */
export const createPsePayment = async (
  paymentData: PsePaymentRequest,
  token?: string,
  retryCount: number = 0
): Promise<ProcessedPsePaymentResponse> => {
  try {
    // Obtener la URL base de la API desde las variables de entorno
    // Usar siempre la URL de sandbox para desarrollo
    const baseOpenPayUrl = process.env.OPEN_PAY_API_URL || 'https://sandbox-api.openpay.co/v1/';
    
    const baseApiUrl = baseOpenPayUrl;
    const merchantId = getMerchantId();
    
    // URL del endpoint para crear pagos PSE
    const url = `${baseApiUrl}${merchantId}/charges/pse`;
    
    console.log(`[createPsePayment] - URL de petición: ${url}`);
    console.log(`[createPsePayment] - Intento #${retryCount + 1}`);
    console.log(`[createPsePayment] - Merchant ID utilizado: ${merchantId}`);
    console.log(`[createPsePayment] - Método HTTP: POST`);
    console.log(`[createPsePayment] - Cabeceras de autenticación configuradas: ${!!token ? 'Con Token JWT adicional' : 'Solo autenticación básica'}`);
    
    console.log(`[createPsePayment] - Datos de pago (resumidos):`, {
      method: paymentData.method,
      amount: paymentData.amount,
      description: paymentData.description,
      order_id: paymentData.order_id,
      currency: paymentData.currency,
      iva: paymentData.iva,
      customer: {
        name: paymentData.customer.name,
        last_name: paymentData.customer.last_name,
        email: paymentData.customer.email,
        phone_number: 'XXXXX' + paymentData.customer.phone_number.slice(-4),
        address: paymentData.customer.address
      },
      redirect_url: paymentData.redirect_url,
      capture: {
        bankCode: paymentData.capture.bankCode,
        document: {
          person_type: paymentData.capture.document.person_type,
          document_type: paymentData.capture.document.document_type,
          document_number: paymentData.capture.document.document_number
        }
      }
    });

    // Realizar la petición POST al endpoint con la configuración que incluye la autenticación
    const config = getRequestConfig(token);
    console.log(`[createPsePayment] - Timeout configurado: ${config.timeout}ms`);
    
    console.log(`[createPsePayment] - ⏱️ Iniciando petición HTTP a OpenPay...`);
    const startTime = Date.now();
    
    const response = await axios.post<PsePaymentResponse>(url, paymentData, config);
    
    const endTime = Date.now();
    console.log(`[createPsePayment] - ⌛ Petición completada en ${endTime - startTime}ms`);
    console.log(`[createPsePayment] - Código de estado HTTP: ${response.status}`);
    
    console.log(`[createPsePayment] - Respuesta recibida:`, {
      id: response.data.id,
      payment_method: {
        type: response.data.payment_method.type,
        url: 'URL_REDIRECTION_HIDDEN_FOR_SECURITY'
      }
    });
    
    // Verificar si la respuesta es exitosa
    if (response.status >= 200 && response.status < 300 && response.data.id) {
      console.log(`[createPsePayment] - ✅ Petición exitosa. ID de transacción: ${response.data.id}`);
      return {
        success: true,
        data: response.data,
        redirectUrl: response.data.payment_method.url
      };
    } else {
      // Si la respuesta no es exitosa pero tiene un formato válido
      console.log(`[createPsePayment] - ⚠️ Respuesta con formato válido pero posible problema de negocio`);
      return {
        success: false,
        error: 'Error al procesar el pago PSE'
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
      
      // Si hay reintentos disponibles y es un error que amerita reintento, reintentar
      const shouldRetry = retryCount < 3 && ( // Aumentar a 3 reintentos para 503
        error.code === 'ECONNABORTED' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        (error.response && (
          error.response.status >= 500 || // Errores 5xx del servidor
          error.response.status === 503 || // Service Unavailable específicamente
          error.response.status === 502 || // Bad Gateway
          error.response.status === 504    // Gateway Timeout
        ))
      );
      
      if (shouldRetry) {
        const nextAttempt = retryCount + 1;
        console.log(`[createPsePayment] - 🔄 ERROR ${error.response?.status} DETECTADO - Reintentando petición (${nextAttempt}/3)...`);
        console.log(`[createPsePayment] - 📋 Razón del reintento: ${error.response?.status === 503 ? 'Servicio no disponible temporalmente' : 'Error de red/servidor'}`);
        
        // Esperar un tiempo antes de reintentar (exponential backoff)
        const delay = Math.pow(2, retryCount) * 3000; // Aumentar delay para 503
        console.log(`[createPsePayment] - ⏳ Esperando ${delay}ms antes del reintento...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[createPsePayment] - 🚀 Ejecutando reintento #${nextAttempt}...`);
        return createPsePayment(paymentData, token, retryCount + 1);
      } else {
        console.log(`[createPsePayment] - ❌ No se realizarán más reintentos. Intentos agotados o error no recuperable.`);
        console.log(`[createPsePayment] - 📊 Estadísticas finales: ${retryCount + 1} intentos realizados`);
      }
      
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