import { useState, useEffect } from 'react';
import { getEstadosAcuerdoPago } from '@/adapters/estados/estadosAcuerdoPago.adapter';
import { EstadoAcuerdoPago } from '@/domain/models/estados/estadosAcuerdoPago.model';

export const useEstadosAcuerdoPago = (token: string | undefined) => {
  const [estados, setEstados] = useState<EstadoAcuerdoPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return; 
    const fetchEstados = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getEstadosAcuerdoPago(token);
        const estadosTransformados = response.data.map(([value, label]) => ({ value, label }));
        setEstados(estadosTransformados);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al consultar estados de acuerdos de pago');
      } finally {
        setLoading(false);
      }
    };
    fetchEstados();
  }, [token]); // Ahora depende del token

  return { estados, loading, error };
}; 