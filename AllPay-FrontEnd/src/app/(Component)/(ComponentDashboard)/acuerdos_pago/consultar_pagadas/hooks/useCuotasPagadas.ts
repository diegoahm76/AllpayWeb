import { useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { getCuotasPagadasExterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar_pagadas/adapters/getCuotasPagadasExterno';
import { CuotasPagadasResponse, CuotasPagadasApiResponse, CuotasPagadasExternoResponse } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar_pagadas/models/CuotasPagadasTypes';
import { getCuotasPagadasInterno } from '@/app/(Component)/(ComponentDashboard)/acuerdos_pago/consultar_pagadas/adapters/getCuotasPagadasInterno';

export const useCuotasPagadas = (isInternalUser: boolean | null) => {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  const token = (session as any)?.user?.tokens?.access;

  const [data, setData] = useState<CuotasPagadasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCuotasPagadas = useCallback(async (filtros = {}) => {
    if (!token) {
      setError('No se encontró el token de autenticación.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (isInternalUser) {
        const response: CuotasPagadasApiResponse = await getCuotasPagadasInterno(token, filtros);
        // Para interno: guardar response.data
        setData(response.data);
      } else {
        const response: CuotasPagadasExternoResponse = await getCuotasPagadasExterno(token);
        // Para externo: guardar response directamente (ya es CuotasPagadasResponse)
        setData(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, isInternalUser]);

  return {
    data,
    isLoading,
    error,
    fetchCuotasPagadas
  };
}; 