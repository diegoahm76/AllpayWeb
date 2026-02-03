import { useCallback, useState, useEffect } from 'react';
import { createPsePayment, generateOrderId, calculateIVA } from '../adapters/createPsePayment';

/**
 * Configuración para el hook usePsePayment
 */
export interface PsePaymentConfig {
  redirectBaseUrl?: string;       // URL base para redirección después del pago
  defaultDescription?: string;    // Descripción por defecto para los pagos
}

// Tipos para los parámetros del pago PSE
export interface CreatePsePaymentParams {
  amount: number;
  bankCode: string;
  personType: '0' | '1'; // 0: Persona Natural, 1: Persona Jurídica
  documentType: string;
  documentNumber: string;
  name: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  orderId: string;
  address: string;
  description: string;
}

/**
 * Hook para manejar pagos PSE
 */
export const usePsePayment = () => {
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // Limpiar el estado cuando el componente se desmonta
  useEffect(() => {
    return () => {
      setError(null);
      setRedirectUrl(null);
      setIsLoading(false);
      setTransactionId(null);
    };
  }, []);

  /**
   * Crear un pago PSE
   */
  const createPayment = useCallback(async (params: CreatePsePaymentParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setRedirectUrl(null);
    setTransactionId(null);
    
    try {
      // Intentar crear el pago, manejando automáticamente errores de duplicación
      let maxRetries = 3;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        attempt++;
        
        // Usar el orderId recibido en params, o generar uno si no viene
        let orderId = params.orderId || generateOrderId();
        
        // Calcular el IVA
        const iva = calculateIVA(params.amount);
        
        // Crear el payload para la API de OpenPay
        const payload = {
          method: 'bank_account',
          amount: params.amount,
          description: params.description,
          order_id: orderId,
          currency: 'COP',
          iva,
          customer: {
            name: params.name,
            last_name: params.lastName,
            email: params.email,
            phone_number: params.phoneNumber,
            address: params.address
          },
          redirect_url: `${window.location.origin}/pagar_cuota/comprobante?reference=${orderId}&amount=${params.amount}&status=pending`,
          capture: {
            bankCode: params.bankCode,
            document: {
              person_type: params.personType,
              document_type: params.documentType,
              document_number: params.documentNumber
            }
          }
        };
                
        // Llamar al adapter para crear el pago
        const response = await createPsePayment(payload);
        
        if (response.success && response.data && response.redirectUrl) {
          // Éxito - actualizar información de transacción en localStorage
          // IMPORTANTE: El ID de OpenPay es lo que usaremos como cod_pago_realizado
          const openPayId = response.data.id;
          
          setRedirectUrl(response.redirectUrl);
          setTransactionId(openPayId);
          return true;
        } else {
          // Verificar si es un error de duplicación (409)
          const isDuplicationError = response.error?.includes('Esta transacción ya fue procesada anteriormente');
          
          if (isDuplicationError && attempt < maxRetries) {
            console.log(`[usePsePayment] - Error de duplicación detectado en intento ${attempt}. Regenerando order_id...`);
            // Continuar el bucle para intentar con un nuevo ID
            continue;
          } else {
            // Error definitivo o se agotaron los intentos
            setError(response.error || 'Error al procesar el pago PSE');
            return false;
          }
        }
      }
      
      // Si llegamos aquí, se agotaron todos los intentos
      setError('No se pudo procesar el pago después de varios intentos. Por favor, contacte al soporte técnico.');
      return false;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el pago PSE';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Redireccionar al usuario a la URL de pago
   */
  const redirectToPayment = useCallback(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  /**
   * Resetear errores
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    redirectUrl,
    isLoading,
    transactionId,
    createPayment,
    redirectToPayment,
    resetError
  };
}; 