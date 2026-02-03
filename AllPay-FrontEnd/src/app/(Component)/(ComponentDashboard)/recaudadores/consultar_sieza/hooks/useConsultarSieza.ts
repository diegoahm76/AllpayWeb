import { useCallback, useState } from 'react';
import { getSiezaConsulta } from '../adapters/sieza.consulta.get';
import {
  GetSiezaConsultaParams,
  SiezaConsultaItem,
  SiezaConsultaResponse
} from '../models/sieza.consulta.types';

const cleanParams = (params: GetSiezaConsultaParams): GetSiezaConsultaParams =>
  Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ) as GetSiezaConsultaParams;

interface UseConsultarSiezaReturn {
  rows: SiezaConsultaItem[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalCuotaFomento: number;
  totalIntereses: number;
  fetchRows: (token: string, params?: GetSiezaConsultaParams) => Promise<SiezaConsultaResponse>;
  handlePageChange: (page: number, token: string) => void;
  clear: () => void;
}

export default function useConsultarSieza(): UseConsultarSiezaReturn {
  const [rows, setRows] = useState<SiezaConsultaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCuotaFomento, setTotalCuotaFomento] = useState(0);
  const [totalIntereses, setTotalIntereses] = useState(0);
  const [searchParams, setSearchParams] = useState<GetSiezaConsultaParams>({ page: 1, page_size: 10 });

  const fetchRows = useCallback(async (token: string, params?: GetSiezaConsultaParams): Promise<SiezaConsultaResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      const query = cleanParams(params || searchParams);
      const resp = await getSiezaConsulta(token, query);
      setRows(resp.data.data);
      setCurrentPage(resp.current_page);
      setTotalPages(resp.total_pages);
      setTotalCuotaFomento(resp.data.total_cuota_fomento);
      setTotalIntereses(resp.data.total_intereses);
      setSearchParams(query);
      return resp;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al consultar el sistema contable';
      setError(msg);
      setRows([]);
      setTotalCuotaFomento(0);
      setTotalIntereses(0);
      return {
        success: false,
        count: 0,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        data: {
          success: false,
          detail: msg,
          data: [],
          total_cuota_fomento: 0,
          total_intereses: 0
        }
      };
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handlePageChange = useCallback((page: number, token: string) => {
    const next = { ...searchParams, page };
    setSearchParams(next);
    fetchRows(token, next);
  }, [searchParams, fetchRows]);

  const clear = useCallback(() => {
    setRows([]);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalCuotaFomento(0);
    setTotalIntereses(0);
    setError(null);
    setSearchParams({ page: 1, page_size: 10 });
  }, []);

  return {
    rows,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalCuotaFomento,
    totalIntereses,
    fetchRows,
    handlePageChange,
    clear
  };
}


