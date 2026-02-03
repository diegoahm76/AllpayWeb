import { useReducer, useCallback } from 'react';
import { 
  PazSalvoApprovalState, 
  PazSalvoApprovalAction,
  PazSalvoApprovalResponse
} from '../models/PazSalvoApprovalTypes';
import { approvePazSalvo } from '../adapters/approvePazSalvo';

// Estado inicial
const initialState: PazSalvoApprovalState = {
  isLoading: false,
  error: null,
  isSuccess: false,
  message: ''
};

// Reducer para manejar el estado
const approvalReducer = (
  state: PazSalvoApprovalState, 
  action: PazSalvoApprovalAction
): PazSalvoApprovalState => {
  switch (action.type) {
    case 'APPROVAL_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        isSuccess: false,
        message: ''
      };
    case 'APPROVAL_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null,
        isSuccess: true,
        message: action.payload.detail
      };
    case 'APPROVAL_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        isSuccess: false,
        message: ''
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

/**
 * Hook para manejar la aprobación/desaprobación de paz y salvos
 */
export const usePazSalvoApproval = (token: string) => {
  const [state, dispatch] = useReducer(approvalReducer, initialState);

  /**
   * Función para aprobar o desaprobar un paz y salvo
   * @param pazSalvoId - ID del paz y salvo
   * @param isApproved - true para aprobar, false para desaprobar
   * @param observacion - Observación para el rechazo (solo requerido si isApproved es false)
   * @returns Promesa con el resultado de la operación
   */
  const handleApproval = useCallback(async (
    pazSalvoId: number | string,
    isApproved: boolean,
    observacion?: string
  ): Promise<PazSalvoApprovalResponse> => {
    // Iniciar la acción
    dispatch({ type: 'APPROVAL_START' });

    try {
      // Llamar al adapter
      const response = await approvePazSalvo(pazSalvoId, isApproved, token, observacion);

      if (response.success) {
        // Si la operación fue exitosa
        dispatch({ 
          type: 'APPROVAL_SUCCESS', 
          payload: response 
        });
      } else {
        // Si hubo un error en la operación
        dispatch({ 
          type: 'APPROVAL_ERROR', 
          payload: response.detail 
        });
      }

      return response;
    } catch (error) {
      // Si ocurrió un error inesperado
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al procesar la solicitud';
      
      dispatch({ 
        type: 'APPROVAL_ERROR', 
        payload: errorMessage 
      });

      return {
        success: false,
        detail: errorMessage
      };
    }
  }, [token]);

  /**
   * Función para reiniciar el estado
   */
  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  return {
    ...state,
    approvePazSalvo: (pazSalvoId: number | string) => handleApproval(pazSalvoId, true),
    disapprovePazSalvo: (pazSalvoId: number | string, observacion: string) => 
      handleApproval(pazSalvoId, false, observacion),
    resetState
  };
}; 