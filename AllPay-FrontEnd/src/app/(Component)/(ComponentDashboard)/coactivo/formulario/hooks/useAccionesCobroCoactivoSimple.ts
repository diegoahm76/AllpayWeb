import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getAccionesCobroCoactivoSimple } from '../adapters/accionesCobroCoactivoSimple.adapter';
import { AccionCobroSimple } from '../models/accionesCobroSimple.model';

export interface AccionCobroOption {
  key: string;
  value: string;
  title: string;
}

export const useAccionesCobroCoactivoSimple = () => {
  const [acciones, setAcciones] = useState<AccionCobroSimple[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  const loadAcciones = useCallback(async () => {
    if (!token) {
      setError('No se encontró el token de autenticación');
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAccionesCobroCoactivoSimple(token);
      if (response.success && Array.isArray(response.data)) {
        setAcciones(response.data);
      } else {
        throw new Error('Formato de respuesta incorrecto');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar las acciones';
      setError(errorMessage);
      setAcciones([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const getAccionOptions = useCallback((): AccionCobroOption[] => {
    return acciones.map(accion => ({
      key: accion.id_accion_cobro_persuasivo.toString(),
      value: accion.id_accion_cobro_persuasivo.toString(),
      title: accion.nombre
    }));
  }, [acciones]);

  const getAccionNombre = useCallback((id: number | string): string => {
    const accion = acciones.find(acc => acc.id_accion_cobro_persuasivo.toString() === id.toString());
    return accion ? accion.nombre : '';
  }, [acciones]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAcciones = useCallback(() => {
    loadAcciones();
  }, [loadAcciones]);

  useEffect(() => {
    if (token) {
      loadAcciones();
    }
  }, [token, loadAcciones]);

  return {
    acciones,
    isLoading,
    error,
    loadAcciones,
    getAccionOptions,
    getAccionNombre,
    resetError,
    refreshAcciones
  };
};


