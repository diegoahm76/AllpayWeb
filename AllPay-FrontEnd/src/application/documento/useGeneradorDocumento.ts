import { useState, useCallback } from 'react';
import {
  GeneradorDocumentoResponse,
  VariablesDocumento
} from '@/domain/models/plantilla/generadorDocumento';
import { generarDocumento as generarDocumentoAPI } from '@/adapters/documento/generarDocumento';

interface UseGeneradorDocumentoProps {
  token: string;
  id_plantilla_doc: number;
  consecutivo?: boolean;
  variable?: string;
}

interface GenerarDocumentoParams {
  variables: VariablesDocumento;
}

interface UseGeneradorDocumentoReturn {
  loading: boolean;
  error: string | null;
  generarDocumento: (params: GenerarDocumentoParams) => Promise<GeneradorDocumentoResponse | null>;
}

export const useGeneradorDocumento = ({
  token,
  id_plantilla_doc,
  variable = 'B',
  consecutivo = false
}: UseGeneradorDocumentoProps): UseGeneradorDocumentoReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generarDocumentoHandler = useCallback(
    async ({ variables }: GenerarDocumentoParams) => {
      if (!id_plantilla_doc) return null;

      setLoading(true);
      setError(null);

      try {
        const response = await generarDocumentoAPI({
          token,
          id_plantilla_doc,
          variables,
          variable,
          consecutivo
        });

        if (!response.success) {
          setError('Error al generar el documento');
        }

        return response;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Error desconocido al generar el documento';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [token, id_plantilla_doc, variable, consecutivo]
  );

  return {
    loading,
    error,
    generarDocumento: generarDocumentoHandler
  };
};
