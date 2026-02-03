import { useCallback, useState } from 'react';
import { getSiezaComprobante } from '../adapters/sieza.comprobante.get';
import {
  GetSiezaComprobanteParams,
  SiezaComprobanteResponse,
  SiezaComprobanteDocumentoContable,
  SiezaComprobanteMovimientoContable,
  SiezaComprobanteMovimientoCxC
} from '../models/sieza.comprobante.types';

const cleanParams = (params: GetSiezaComprobanteParams): GetSiezaComprobanteParams =>
  Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ) as GetSiezaComprobanteParams;

interface UseSiezaComprobanteReturn {
  comprobanteData: SiezaComprobanteResponse | null;
  documentosContables: SiezaComprobanteDocumentoContable[];
  movimientosContables: SiezaComprobanteMovimientoContable[];
  movimientosCxC: SiezaComprobanteMovimientoCxC[];
  isLoading: boolean;
  error: string | null;
  fetchComprobante: (token: string, params?: GetSiezaComprobanteParams) => Promise<SiezaComprobanteResponse>;
  clear: () => void;
}

export default function useSiezaComprobante(): UseSiezaComprobanteReturn {
  const [comprobanteData, setComprobanteData] = useState<SiezaComprobanteResponse | null>(null);
  const [documentosContables, setDocumentosContables] = useState<SiezaComprobanteDocumentoContable[]>([]);
  const [movimientosContables, setMovimientosContables] = useState<SiezaComprobanteMovimientoContable[]>([]);
  const [movimientosCxC, setMovimientosCxC] = useState<SiezaComprobanteMovimientoCxC[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComprobante = useCallback(async (token: string, params?: GetSiezaComprobanteParams): Promise<SiezaComprobanteResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      const query = cleanParams(params || {});
      const resp = await getSiezaComprobante(token, query);
      
      setComprobanteData(resp);
      setDocumentosContables(resp.DocumentoContable || []);
      setMovimientosContables(resp.Movimientocontable || []);
      setMovimientosCxC(resp.MovimientoCxC || []);
      
      return resp;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar comprobante del sistema contable';
      setError(msg);
      setComprobanteData(null);
      setDocumentosContables([]);
      setMovimientosContables([]);
      setMovimientosCxC([]);
      
      return {
        success: false,
        Inicial: { COMPAÑIA: '' },
        DocumentoContable: [],
        Movimientocontable: [],
        MovimientoCxC: [],
        Final: { "Compañía": '' }
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setComprobanteData(null);
    setDocumentosContables([]);
    setMovimientosContables([]);
    setMovimientosCxC([]);
    setError(null);
  }, []);

  return {
    comprobanteData,
    documentosContables,
    movimientosContables,
    movimientosCxC,
    isLoading,
    error,
    fetchComprobante,
    clear
  };
}
