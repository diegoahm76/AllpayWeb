import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { updateAccionCobroPersuasivo } from '../adapters/updateAccionCobroPersuasivo.adapter';
import { UpdateAccionCobroPersuasivoPayload, UpdateAccionCobroPersuasivoResponse } from '../models/accionesCobroPersuasivo.model';

interface UseUpdateAccionCobroPersuasivoReturn {
  loading: boolean;
  error: string | null;
  data: UpdateAccionCobroPersuasivoResponse | null;
  update: (id: number, payload: UpdateAccionCobroPersuasivoPayload) => Promise<UpdateAccionCobroPersuasivoResponse>;
  clearError: () => void;
}

/**
 * Hook personalizado para actualizar acciones de cobro persuasivo
 * @returns Estado y funciones para actualizar acciones de cobro persuasivo
 */
export const useUpdateAccionCobroPersuasivo = (): UseUpdateAccionCobroPersuasivoReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UpdateAccionCobroPersuasivoResponse | null>(null);

  // Obtener la sesión y el token
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const token = (session as any)?.user?.tokens?.access;

  // Función para actualizar una acción existente
  const update = async (id: number, payload: UpdateAccionCobroPersuasivoPayload): Promise<UpdateAccionCobroPersuasivoResponse> => {
    if (!token) {
      const errorMessage = 'No se encontró el token de autenticación';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setLoading(true);
      setError(null);

      const response = await updateAccionCobroPersuasivo(token, id, payload);

      if (response.success) {
        setData(response);
        return response;
      } else {
        const errorMessage = response.detail || 'Error al actualizar la acción de cobro persuasivo';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al actualizar la acción de cobro persuasivo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    data,
    update,
    clearError
  };
}; 