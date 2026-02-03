import { useState, useEffect, useCallback } from 'react';
import { getDetalleAcuerdoPagoExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/detalleAcuerdoPagoExterno.adapter';
import { DetalleAcuerdoPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/detalleAcuerdoPago.model';
import { getDetalleAcuerdoPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/detalleAcuerdoPagoInterno.adapter';

export const useDetalleAcuerdoPago = (token: string, id: number | string | null, isInternalUser: boolean | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetalleAcuerdoPagoResponse | null>(null);

  const fetchDetalle = useCallback(async () => {
    if (!token || !id || isInternalUser === null) return;
    setLoading(true);
    setError(null);
    try {
      const response = isInternalUser ? await getDetalleAcuerdoPagoInterno(token, id) : await getDetalleAcuerdoPagoExterno(token, id);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar detalle de acuerdo de pago externo');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchDetalle();
  }, [fetchDetalle]);

  return {
    loading,
    error,
    data,
    refetch: fetchDetalle
  };
}; 