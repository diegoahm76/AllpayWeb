import { useCallback } from 'react';
import { createProvider, NaturalPayload, JuridicaPayload } from '@/adapters/user/provider/provider.create';

export const useCreateProvider = () => {
  const handleCreateProvider = useCallback(
    async (
      payload: NaturalPayload | JuridicaPayload,
      token: string
    ) => {
      return await createProvider(payload, token);
    },
    []
  );

  return { handleCreateProvider };
};
