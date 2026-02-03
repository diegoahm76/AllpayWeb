import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getAccionesCobroSimple } from '../adapters/accionesCobroSimple.adapter';
import { AccionCobroSimple } from '../models/accionesCobroSimple.model';

// Interface para las opciones del select
export interface AccionCobroOption {
  key: string;
  value: string;
  title: string;
}

/**
 * Hook personalizado para manejar acciones de cobro persuasivo simples
 * @returns Estado y funciones para manejar las acciones de cobro persuasivo
 */
export const useAccionesCobroSimple = () => {
  const [acciones, setAcciones] = useState<AccionCobroSimple[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener la sesión y el token
  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Función para cargar las acciones
  const loadAcciones = useCallback(async () => {
    if (!token) {
      setError('No se encontró el token de autenticación');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await getAccionesCobroSimple(token);

      if (response.success && Array.isArray(response.data)) {
        setAcciones(response.data);
      } else {
        throw new Error('Formato de respuesta incorrecto');
      }

    } catch (err) {
      console.error('[useAccionesCobroSimple] - Error al cargar acciones:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar las acciones';
      setError(errorMessage);
      setAcciones([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Función para obtener las opciones del select
  const getAccionOptions = useCallback((): AccionCobroOption[] => {
    return acciones.map(accion => ({
      key: accion.id_accion_cobro_persuasivo.toString(),
      value: accion.id_accion_cobro_persuasivo.toString(),
      title: accion.nombre
    }));
  }, [acciones]);

  // Función para obtener el nombre de una acción por su ID
  const getAccionNombre = useCallback((id: number | string): string => {
    const accion = acciones.find(acc => acc.id_accion_cobro_persuasivo.toString() === id.toString());
    return accion ? accion.nombre : '';
  }, [acciones]);

  // Función para limpiar errores
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Función para refrescar las acciones
  const refreshAcciones = useCallback(() => {
    loadAcciones();
  }, [loadAcciones]);

  // Cargar acciones automáticamente cuando el token esté disponible
  useEffect(() => {
    if (token) {
      loadAcciones();
    }
  }, [token, loadAcciones]);

  return {
    // Estados
    acciones,
    isLoading,
    error,

    // Funciones
    loadAcciones,
    getAccionOptions,
    getAccionNombre,
    resetError,
    refreshAcciones
  };
}; 