import { useState, useCallback } from 'react';
import { getConsultaPlanesPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/aprobacion/juridica/adapters/consultaDatosDocumentoPlanesPagoAprobacionJuridica.adapter';
import { ConsultaPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/obtenerDatosDocumentoAcuerdoPago.model';

export const useConsultarDatosDocumentoPlanesPago = (
  token: string,
  isInternalUser: boolean | null
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConsultaPlanesPagoResponse | null>(null);

  const fetchDatosDocumento = useCallback(async (id: number | string) => {
    if (!token || !id || isInternalUser === null) {
      setData(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getConsultaPlanesPagoInterno(token, id);
      setData(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al consultar datos del documento de planes de pago';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token, isInternalUser]);

  const clearError = () => setError(null);

  return {
    loading,
    error,
    data,
    fetchDatosDocumento,
    clearError
  };
};
