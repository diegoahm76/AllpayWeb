import { useState, useEffect, useCallback } from 'react';
import { getVentanaEmergenteDetallesPlanesPago } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/ventanaEmergenteDetallesPlanesPago.adapter';
import { VentanaEmergenteDetallesPlanesPagoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/models/ventanaEmergenteDetallesPlanesPago.model';
import { getVentanaEmergenteDetallesPlanesPagoInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar/adapters/ventanaEmergenteDetallesPlanesPagoInterno.adapter';

export const useVentanaEmergenteDetallesPlanesPago = (token: string, id_solicitud: number | string | null, isInternalUser: boolean | null) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VentanaEmergenteDetallesPlanesPagoResponse | null>(null);

  const fetchVentanaEmergenteDetalles = useCallback(async () => {
    if (!token || !id_solicitud || isInternalUser === null) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = isInternalUser ? await getVentanaEmergenteDetallesPlanesPagoInterno(token, id_solicitud) : await getVentanaEmergenteDetallesPlanesPago(token, id_solicitud);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar ventana emergente de detalles de planes de pago');
    } finally {
      setLoading(false);
    }
  }, [token, id_solicitud, isInternalUser]);

  useEffect(() => {
    fetchVentanaEmergenteDetalles();
  }, [fetchVentanaEmergenteDetalles]);

  return {
    loading,
    error,
    data,
    refetch: fetchVentanaEmergenteDetalles
  };
}; 