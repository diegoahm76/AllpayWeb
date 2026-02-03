import { useReducer, useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  UserProfileState, 
  UserProfileAction, 
  UserProfileConfig,
  documentTypeMapping,
  personTypeMapping
} from '../models/UserTypes';
import { getUserProfile, extractProfileFromSession } from '../adapters/getUserProfile';

// Valores por defecto para la configuración
const DEFAULT_CONFIG: Required<UserProfileConfig> = {
  cacheTime: 3600000, // 1 hora en milisegundos
  retryCount: 3
};

// Estado inicial
const initialState: UserProfileState = {
  profile: null,
  isLoading: false,
  error: null,
  lastFetch: null
};

// Reducer para manejar el estado
const profileReducer = (state: UserProfileState, action: UserProfileAction): UserProfileState => {
  switch (action.type) {
    case 'FETCH_PROFILE_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'FETCH_PROFILE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        profile: action.payload,
        error: null,
        lastFetch: new Date()
      };
    case 'FETCH_PROFILE_ERROR':
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
 * Hook para obtener y manejar el perfil del usuario
 * @param configOverrides - Sobreescritura de la configuración por defecto
 * @returns Estado y funciones para manejar el perfil del usuario
 */
export const useUserProfile = (configOverrides?: Partial<UserProfileConfig>) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const [config] = useState<Required<UserProfileConfig>>({
    ...DEFAULT_CONFIG,
    ...configOverrides
  });
  
  // Obtener la sesión y el token
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.tokens?.access;

  // Verificar si la cache es válida
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - state.lastFetch.getTime();
    return cacheAge < config.cacheTime;
  }, [state.lastFetch, config.cacheTime]);

  // Función para obtener el perfil desde la API
  const fetchProfileFromAPI = useCallback(async (forceRefresh = false) => {
    // Si no hay token o la sesión está cargando, no hacer nada
    if (!token || status !== 'authenticated') {
      console.log('[useUserProfile] - No hay token disponible o la sesión no está autenticada');
      return;
    }

    // Si la caché es válida y no se fuerza la actualización, usar la caché
    if (isCacheValid() && !forceRefresh) {
      console.log('[useUserProfile] - Usando datos en caché');
      return;
    }

    try {
      dispatch({ type: 'FETCH_PROFILE_START' });
      console.log('[useUserProfile] - Obteniendo perfil de usuario...');

      const response = await getUserProfile(token);

      if (response.success) {
        console.log('[useUserProfile] - Perfil obtenido correctamente');
        dispatch({ type: 'FETCH_PROFILE_SUCCESS', payload: response.data });
      } else {
        console.error('[useUserProfile] - Error al obtener perfil:', response.error);
        dispatch({ type: 'FETCH_PROFILE_ERROR', payload: response.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('[useUserProfile] - Error inesperado:', error);
      dispatch({ 
        type: 'FETCH_PROFILE_ERROR', 
        payload: error instanceof Error ? error.message : 'Error desconocido al obtener perfil' 
      });
    }
  }, [token, status, isCacheValid]);

  // Función para obtener el perfil desde la sesión
  const fetchProfileFromSession = useCallback(() => {
    if (!session || status !== 'authenticated') {
      console.log('[useUserProfile] - La sesión no está disponible o no está autenticada');
      return;
    }

    try {
      dispatch({ type: 'FETCH_PROFILE_START' });
      console.log('[useUserProfile] - Extrayendo perfil de la sesión...');

      const profileData = extractProfileFromSession(session);
      
      console.log('[useUserProfile] - Perfil extraído de la sesión:', profileData);
      dispatch({ type: 'FETCH_PROFILE_SUCCESS', payload: profileData });
    } catch (error) {
      console.error('[useUserProfile] - Error al extraer perfil de la sesión:', error);
      dispatch({ 
        type: 'FETCH_PROFILE_ERROR', 
        payload: error instanceof Error ? error.message : 'Error al extraer datos de la sesión' 
      });
    }
  }, [session, status]);

  // Reiniciar el error
  const resetError = useCallback(() => {
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  // Efecto para cargar el perfil automáticamente al montar el componente
  useEffect(() => {
    // Primero intentamos extraer la información básica de la sesión
    if (session && status === 'authenticated') {
      fetchProfileFromSession();
      
      // Luego intentamos obtener información más completa de la API
      fetchProfileFromAPI();
    }
  }, [session, status, fetchProfileFromSession, fetchProfileFromAPI]);

  // Función para mapear el tipo de documento al formato requerido por PSE
  const getMappedDocumentType = useCallback((documentType: string | undefined): string => {
    if (!documentType) return '';
    return documentTypeMapping[documentType.toLowerCase()] || documentType;
  }, []);

  // Función para mapear el tipo de persona al formato requerido por PSE
  const getMappedPersonType = useCallback((personType: string | undefined): string => {
    if (!personType) return '';
    return personTypeMapping[personType.toLowerCase()] || personType;
  }, []);

  return {
    ...state,
    fetchProfileFromAPI,
    fetchProfileFromSession,
    resetError,
    refreshProfile: () => fetchProfileFromAPI(true), // Función para forzar la actualización
    getMappedDocumentType,
    getMappedPersonType
  };
}; 