import { useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { getAccionesCobroPersuasivo } from '../adapters/accionesCobroPersuasivo.adapter';
import { AccionesCobroPersuasivoResponse, AccionCobroPersuasivo } from '../models/accionesCobroPersuasivo.model';

interface UseAccionesCobroPersuasivoReturn {
  data: AccionCobroPersuasivo[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook personalizado para manejar las acciones de cobro persuasivo
 * @returns Estado y funciones para manejar las acciones de cobro persuasivo
 */
export const useAccionesCobroPersuasivo = (): UseAccionesCobroPersuasivoReturn => {
  const [data, setData] = useState<AccionCobroPersuasivo[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener la sesión y el token
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const token = (session as any)?.user?.tokens?.access;

  // Función para obtener los datos
  const fetchAcciones = useCallback(async () => {
    if (!token) {
      setError('No se encontró el token de autenticación');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response: AccionesCobroPersuasivoResponse = await getAccionesCobroPersuasivo(token);

      if (response.success) {
        setData(response.data);
      } else {
        console.error('[useAccionesCobroPersuasivo] - Error en la respuesta:', response.detail);
        setError(response.detail || 'Error al obtener las acciones de cobro persuasivo');
        setData(null);
      }
    } catch (err) {
      console.error('[useAccionesCobroPersuasivo] - Error inesperado:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al obtener las acciones de cobro persuasivo';
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Función para refrescar los datos
  const refetch = useCallback(async () => {
    await fetchAcciones();
  }, [fetchAcciones]);

  // Cargar datos automáticamente cuando el token esté disponible
  useEffect(() => {
    if (token) {
      fetchAcciones();
    }
  }, [token, fetchAcciones]);

  return {
    data,
    loading,
    error,
    refetch,
    clearError
  };
}; 