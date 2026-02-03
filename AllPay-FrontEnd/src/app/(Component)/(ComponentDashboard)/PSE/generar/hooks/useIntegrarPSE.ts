import { useState } from 'react';
import { integrarPSE, DatosPagoRequest, DatosPagoResponse } from '../adapters/integrarPSE';

const useIntegrarPSE = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionInfo, setTransactionInfo] = useState<{
    url_pago: string;
    transaction_id: string;
  } | null>(null);

  const iniciarPagoPSE = async (token: string, idFacturas: number[], redirectUrl: string): Promise<DatosPagoResponse> => {
    setIsLoading(true);
    setError(null);
    setTransactionInfo(null);

    try {
      const request: DatosPagoRequest = {
        id_factura_unica: idFacturas,
        redirect_url: redirectUrl
      };

      const response = await integrarPSE(token, request);
      
      if (!response.success || !response.data) {
        throw new Error(response.detail || 'Error al iniciar el pago con PSE');
      }

      setTransactionInfo(response.data);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar el pago con PSE';
      setError(errorMessage);
      
      return {
        success: false,
        detail: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarEstado = () => {
    setIsLoading(false);
    setError(null);
    setTransactionInfo(null);
  };

  return {
    isLoading,
    error,
    transactionInfo,
    iniciarPagoPSE,
    limpiarEstado
  };
};

export default useIntegrarPSE; 