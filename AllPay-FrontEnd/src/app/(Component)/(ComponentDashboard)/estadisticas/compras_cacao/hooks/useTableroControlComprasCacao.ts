import { useState, useCallback } from 'react';
import { obtenerTableroControlComprasCacao } from '../adapters/tableroControlComprasCacao.adapter';
import { TableroControlComprasCacaoData, TableroControlComprasCacaoParams } from '../models/tableroControlComprasCacao.model';

const useTableroControlComprasCacao = () => {
  const [data, setData] = useState<TableroControlComprasCacaoData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 0,
    current_page: 1,
    next: '',
    previous: ''
  });

  const fetchTablero = useCallback(async (token: string, params: TableroControlComprasCacaoParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await obtenerTableroControlComprasCacao(token, params);
      setData(response.data);
      setPagination({
        count: response.count,
        total_pages: response.total_pages,
        current_page: response.current_page,
        next: response.next || '',
        previous: response.previous || ''
      });
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del tablero de control de compras de cacao');
      setData(null);
      setPagination({
        count: 0,
        total_pages: 0,
        current_page: 1,
        next: '',
        previous: ''
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setPagination({
      count: 0,
      total_pages: 0,
      current_page: 1,
      next: '',
      previous: ''
    });
  }, []);

  return { 
    data, 
    isLoading, 
    error, 
    pagination,
    fetchTablero, 
    clearData 
  };
};

export default useTableroControlComprasCacao;
