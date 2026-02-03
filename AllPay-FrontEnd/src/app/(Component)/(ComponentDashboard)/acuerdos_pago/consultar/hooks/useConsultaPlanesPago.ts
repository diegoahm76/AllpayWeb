import { useState, useCallback } from 'react';
import { getConsultaPlanesPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/consultaDatosDocumentoPlanesPagoInterno.adapter';
import { ConsultaPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/obtenerDatosDocumentoAcuerdoPago.model';

export const useConsultaPlanesPago = (token: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConsultaPlanesPagoResponse | null>(null);

  const fetchPlanesPago = useCallback(async (id: number | string) => {
    if (!token) {
      setError('No hay token de autenticación');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await getConsultaPlanesPagoInterno(token, id);
      setData(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al consultar planes de pago';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    loading,
    error,
    data,
    fetchPlanesPago
  };
}; 