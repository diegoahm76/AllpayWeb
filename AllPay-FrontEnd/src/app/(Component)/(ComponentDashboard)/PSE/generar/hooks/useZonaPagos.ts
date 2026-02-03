import { useState } from 'react';
import { iniciarPagoZonaPagos, ZonaPagosRequest, ZonaPagosResponse } from '../adapters/iniciarPagoZonaPagos';

const useZonaPagos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagoInfo, setPagoInfo] = useState<{
    redirect_url: string;
    identificador: string;
    id_pago: number;
  } | null>(null);

  const iniciarPago = async (token: string, datosRequest: ZonaPagosRequest): Promise<ZonaPagosResponse> => {
    setIsLoading(true);
    setError(null);
    setPagoInfo(null);

    try {
      const response = await iniciarPagoZonaPagos(token, datosRequest);
      
      if (!response.success) {
        throw new Error('Error al iniciar el pago con ZonaPagos');
      }

      setPagoInfo({
        redirect_url: response.redirect_url,
        identificador: response.identificador,
        id_pago: response.id_pago
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar el pago con ZonaPagos';
      setError(errorMessage);
      
      return {
        success: false,
        redirect_url: '',
        identificador: '',
        id_pago: 0
      };
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarEstado = () => {
    setIsLoading(false);
    setError(null);
    setPagoInfo(null);
  };

  return {
    isLoading,
    error,
    pagoInfo,
    iniciarPago,
    limpiarEstado
  };
};

export default useZonaPagos;
