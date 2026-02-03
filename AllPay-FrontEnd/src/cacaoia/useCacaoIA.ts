'use client';

import { useCallback, useState } from 'react';
import { cacaoIAAsk } from '@cacaoia/adapter';
import { CacaoIAAskRequest, CacaoIAAskResponse } from '@cacaoia/models';

export interface UseCacaoIAOptions {
  token?: string;
}

export interface UseCacaoIAState {
  loading: boolean;
  error: string | null;
  data: CacaoIAAskResponse | null;
}

export function useCacaoIA(options: UseCacaoIAOptions = {}): [UseCacaoIAState, (question: string) => Promise<void>] {
  const { token } = options;
  const [state, setState] = useState<UseCacaoIAState>({ loading: false, error: null, data: null });

  const ask = useCallback(async (question: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const payload: CacaoIAAskRequest = { question };
      const data = await cacaoIAAsk(payload, token);
      setState({ loading: false, error: null, data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setState({ loading: false, error: msg, data: null });
    }
  }, [token]);

  return [state, ask];
}


