import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { createAccionCobroPersuasivo } from '../adapters/createAccionCobroPersuasivo.adapter';
import { CreateAccionCobroPersuasivoPayload, CreateAccionCobroPersuasivoResponse } from '../models/accionesCobroPersuasivo.model';

interface UseCreateAccionCobroPersuasivoReturn {
  loading: boolean;
  error: string | null;
  data: CreateAccionCobroPersuasivoResponse | null;
  create: (payload: CreateAccionCobroPersuasivoPayload) => Promise<CreateAccionCobroPersuasivoResponse>;
  clearError: () => void;
}

/**
 * Hook personalizado para crear acciones de cobro persuasivo
 * @returns Estado y funciones para crear acciones de cobro persuasivo
 */
export const useCreateAccionCobroPersuasivo = (): UseCreateAccionCobroPersuasivoReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CreateAccionCobroPersuasivoResponse | null>(null);

  // Obtener la sesión y el token
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });

  const token = (session as any)?.user?.tokens?.access;

  // Función para crear una nueva acción
  const create = async (payload: CreateAccionCobroPersuasivoPayload): Promise<CreateAccionCobroPersuasivoResponse> => {
    if (!token) {
      const errorMessage = 'No se encontró el token de autenticación';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      setLoading(true);
      setError(null);

      const response = await createAccionCobroPersuasivo(token, payload);

      if (response.success) {
        setData(response);
        return response;
      } else {
        console.error('[useCreateAccionCobroPersuasivo] - Error en la respuesta:', response.detail);
        const errorMessage = response.detail || 'Error al crear la acción de cobro persuasivo';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('[useCreateAccionCobroPersuasivo] - Error inesperado:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al crear la acción de cobro persuasivo';
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
    create,
    clearError
  };
}; 