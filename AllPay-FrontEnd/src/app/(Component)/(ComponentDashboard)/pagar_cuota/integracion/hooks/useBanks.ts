import { useReducer, useEffect, useCallback, useState } from 'react';
import { BanksState, BanksAction, PseBank, BanksConfig } from '../models/BankTypes';
import { getBanks } from '../adapters/getBanks';

// Valores por defecto para la configuración
const DEFAULT_CONFIG: Required<BanksConfig> = {
  cacheTime: 3600000, // 1 hora en milisegundos
  retryCount: 3,
  tokenRequired: false // Ya no requerimos token
};

// Estado inicial
const initialState: BanksState = {
  banks: [],
  isLoading: false,
  error: null,
  lastFetch: null
};

// Reducer para manejar el estado
const banksReducer = (state: BanksState, action: BanksAction): BanksState => {
  switch (action.type) {
    case 'FETCH_BANKS_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'FETCH_BANKS_SUCCESS':
      return {
        ...state,
        isLoading: false,
        banks: action.payload,
        error: null,
        lastFetch: new Date()
      };
    case 'FETCH_BANKS_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    case 'RESET_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

/**
 * Hook para obtener y manejar los bancos PSE
 * @param configOverrides - Sobreescritura de la configuración por defecto
 * @returns Estado y funciones para manejar los bancos PSE
 */
export const useBanks = (configOverrides?: Partial<BanksConfig>) => {
  const [state, dispatch] = useReducer(banksReducer, initialState);
  const [config] = useState<Required<BanksConfig>>({
    ...DEFAULT_CONFIG,
    ...configOverrides
  });

  // Verificar si la cache es válida
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - state.lastFetch.getTime();
    return cacheAge < config.cacheTime;
  }, [state.lastFetch, config.cacheTime]);

  // Función para obtener los bancos
  const fetchBanks = useCallback(async (forceRefresh = false) => {
    // Si la caché es válida y no se fuerza la actualización, usar la caché
    if (isCacheValid() && !forceRefresh) {
      console.log('[useBanks] - Usando datos en caché');
      return;
    }

    try {
      dispatch({ type: 'FETCH_BANKS_START' });
      console.log('[useBanks] - Obteniendo bancos...');

      const response = await getBanks();

      if (response.success) {
        console.log(`[useBanks] - Se obtuvieron ${response.data.length} bancos`);
        dispatch({ type: 'FETCH_BANKS_SUCCESS', payload: response.data });
      } else {
        console.error('[useBanks] - Error al obtener bancos:', response.error);
        dispatch({ type: 'FETCH_BANKS_ERROR', payload: response.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[useBanks] - Error inesperado:', error);
      dispatch({ 
        type: 'FETCH_BANKS_ERROR', 
        payload: error instanceof Error ? error.message : 'Error desconocido al obtener bancos' 
      });
    }
  }, [isCacheValid]);

  // Reiniciar el error
  const resetError = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  // Efecto para cargar los bancos automáticamente al montar el componente
  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  // Función para convertir los bancos a opciones para el select
  const getBankOptions = useCallback(() => {
    return state.banks.map((bank: PseBank) => ({
      key: bank.bankCode,
      value: bank.bankCode,
      title: bank.bankName
    }));
  }, [state.banks]);

  return {
    ...state,
    fetchBanks,
    resetError,
    getBankOptions,
    refreshBanks: () => fetchBanks(true) // Función para forzar la actualización
  };
}; 