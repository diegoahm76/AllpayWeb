import { useReducer, useEffect, useCallback, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { 
  PersonaPagoState, 
  PersonaPagoAction, 
  PersonaPagoConfig,
  documentTypeMapping,
  personTypeMapping
} from '../models/PersonaTypes';
import { getPersonaPago } from '../adapters/getPersonaPago';

// Valores por defecto para la configuración
const DEFAULT_CONFIG: Required<PersonaPagoConfig> = {
  cacheTime: 3600000, // 1 hora en milisegundos
  retryCount: 3
};

// Estado inicial
const initialState: PersonaPagoState = {
  persona: null,
  isLoading: false,
  error: null,
  lastFetch: null
};

// Reducer para manejar el estado
const personaReducer = (state: PersonaPagoState, action: PersonaPagoAction): PersonaPagoState => {
  switch (action.type) {
    case 'FETCH_PERSONA_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'FETCH_PERSONA_SUCCESS':
      return {
        ...state,
        isLoading: false,
        persona: action.payload,
        error: null,
        lastFetch: new Date()
      };
    case 'FETCH_PERSONA_ERROR':
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
 * Hook para obtener y manejar los datos de la persona para pagos PSE
 * @param configOverrides - Sobreescritura de la configuración por defecto
 * @returns Estado y funciones para manejar los datos de la persona
 */
export const usePersonaPago = (configOverrides?: Partial<PersonaPagoConfig>) => {
  const [state, dispatch] = useReducer(personaReducer, initialState);
  const [config] = useState<Required<PersonaPagoConfig>>({
    ...DEFAULT_CONFIG,
    ...configOverrides
  });
  
  // Obtener la sesión y el token
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    }
  });
  
  const token = (session as any)?.user?.tokens?.access;

  // Verificar si la cache es válida
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - state.lastFetch.getTime();
    return cacheAge < config.cacheTime;
  }, [state.lastFetch, config.cacheTime]);

  // Función para obtener los datos de la persona desde la API
  const fetchPersonaFromAPI = useCallback(async (forceRefresh = false) => {
    // Si no hay token, no hacer nada
    if (!token) {
      console.log('[usePersonaPago] - No hay token disponible');
      return;
    }

    // Si la caché es válida y no se fuerza la actualización, usar la caché
    if (isCacheValid() && !forceRefresh) {
      console.log('[usePersonaPago] - Usando datos en caché');
      return;
    }

    try {
      dispatch({ type: 'FETCH_PERSONA_START' });
      console.log('[usePersonaPago] - Obteniendo datos de la persona...');

      const response = await getPersonaPago(token);

      if (response.success) {
        console.log('[usePersonaPago] - Datos de la persona obtenidos correctamente');
        dispatch({ type: 'FETCH_PERSONA_SUCCESS', payload: response.data });
      } else {
        console.error('[usePersonaPago] - Error al obtener datos de la persona:', response.error);
        dispatch({ type: 'FETCH_PERSONA_ERROR', payload: response.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[usePersonaPago] - Error inesperado:', error);
      dispatch({ 
        type: 'FETCH_PERSONA_ERROR', 
        payload: error instanceof Error ? error.message : 'Error desconocido al obtener datos de la persona' 
      });
    }
  }, [token, isCacheValid]);

  // Reiniciar el error
  const resetError = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  // Efecto para cargar los datos de la persona automáticamente al montar el componente
  useEffect(() => {
    if (token) {
      fetchPersonaFromAPI();
    }
  }, [token, fetchPersonaFromAPI]);

  // Función para mapear el tipo de documento al formato requerido por PSE
  const getMappedDocumentType = useCallback((documentType: string | undefined): string => {
    if (!documentType) return '';
    return documentTypeMapping[documentType] || documentType;
  }, []);

  // Función para mapear el tipo de persona al formato requerido por PSE
  const getMappedPersonType = useCallback((personType: string | undefined): string => {
    if (!personType) return '';
    return personTypeMapping[personType] || personType;
  }, []);

  // Función para obtener datos formateados para el formulario de PSE
  const getFormData = useCallback(() => {
    if (!state.persona) return null;
    
    return {
      tipoPersona: getMappedPersonType(state.persona.tipo_persona),
      tipoDocumento: getMappedDocumentType(state.persona.tipo_documento),
      numeroIdentificacion: state.persona.numero_documento,
      nombre: state.persona.nombres,
      apellido: state.persona.apellidos,
      telefono: state.persona.telefono_celular || state.persona.telefono_empresa,
      email: state.persona.email,
      direccion: state.persona.direccion_residencia || ''
    };
  }, [state.persona, getMappedDocumentType, getMappedPersonType]);

  return {
    ...state,
    fetchPersonaFromAPI,
    resetError,
    refreshPersona: () => fetchPersonaFromAPI(true), // Función para forzar la actualización
    getMappedDocumentType,
    getMappedPersonType,
    getFormData
  };
}; 