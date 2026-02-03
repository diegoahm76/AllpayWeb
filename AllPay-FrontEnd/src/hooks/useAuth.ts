'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Exception, handleException } from '@/adapters/shared/exception';
import { AuthUseCase } from '@/application/auth/auth.usecase';
import { AuthResource } from '@/application/auth/resources/auth.resource';
import { UserToken } from '@/domain/auth/types/user-token.type';
import { Path } from '@/application/shared/path.enum';

/**
 * Hook unificado para la gestión de autenticación y sesión
 * Centraliza toda la lógica de manejo de sesión en un solo lugar
 */
export const useAuth = () => {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<UserToken | null>(null);
  const [showSessionExpiredAlert, setShowSessionExpiredAlert] = useState(false);
  const authUseCase = new AuthUseCase();

  // Obtiene la URL completa del login considerando el dominio actual
  const getLoginUrl = useCallback((): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${Path.Login}`;
    }
    return Path.Login;
  }, []);

  // useSession configurado correctamente para evitar redirecciones incorrectas
  const {
    data: session,
    status,
    update
  } = useSession({
    required: false, // Cambiado a false para manejar manualmente
  });

  // Monitorea el estado de la sesión
  useEffect(() => {
    console.log('[USE_AUTH] Estado de sesión cambiado:', {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id
    });
    
    const checkSession = async () => {
      try {
        if (status === 'authenticated' && session?.user) {
          console.log('[USE_AUTH] ✅ Sesión autenticada, estableciendo token');
          setSessionToken(session.user);
        } else if (status === 'unauthenticated') {
          console.log('[USE_AUTH] ❌ Sesión no autenticada, limpiando token');
          setSessionToken(null);
        } else if (status === 'loading') {
          console.log('[USE_AUTH] ⏳ Cargando sesión...');
        }
      } catch (error) {
        console.error('[USE_AUTH] Error al verificar sesión:', error);
        handleException(error as Exception);
      }
    };

    checkSession();
  }, [session, status]);

  /**
   * Maneja la expiración de sesión de forma centralizada
   */
  const handleSessionExpired = useCallback(async () => {
    setShowSessionExpiredAlert(false);
    
    try {
      // Limpia el almacenamiento local
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Cierra sesión con la URL completa correcta
      await signOut({
        redirect: false,
        callbackUrl: getLoginUrl()
      });

      // Pequeño delay para asegurar que signOut complete
      setTimeout(() => {
        router.push(Path.Login);
      }, 100);
    } catch (error) {
      console.error('Error al cerrar sesión tras expiración:', error);
      // Forzar redirección incluso si hay error
      router.push(Path.Login);
    }
  }, [router, getLoginUrl]);

  /**
   * Muestra la alerta de sesión expirada
   */
  const triggerSessionExpired = useCallback(() => {
    setShowSessionExpiredAlert(true);
  }, []);

  /**
   * Maneja el login redirigiendo correctamente
   */
  const handleLogin = useCallback(async () => {
    const loginUrl = getLoginUrl();
    
    try {
      await signIn('credentials', {
        redirect: true,
        callbackUrl: loginUrl
      });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      // Fallback: redirección manual
      if (typeof window !== 'undefined') {
        window.location.href = loginUrl;
      }
    }
  }, [getLoginUrl]);

  /**
   * Cierre de sesión manual (logout button)
   */
  const handleLogout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      await signOut({
        redirect: false,
        callbackUrl: getLoginUrl()
      });

      setTimeout(() => {
        router.push(Path.Login);
      }, 100);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push(Path.Login);
    }
  }, [router, getLoginUrl]);

  /**
   * Actualiza los datos de sesión
   */
  const updateSession = useCallback(async (data: UserToken): Promise<void> => {
    try {
      if (!authUseCase.IsValidEmail(data.email)) {
        await alert(AuthResource.EmailValid);
        return;
      }

      await update(data);
    } catch (error) {
      throw handleException(error as Exception);
    }
  }, [update, authUseCase]);

  /**
   * Verifica si el usuario está autenticado
   */
  const isAuthenticated = status === 'authenticated';

  /**
   * Verifica si la sesión está cargando
   */
  const isLoading = status === 'loading';

  return {
    // Estado
    session,
    sessionToken,
    status,
    isAuthenticated,
    isLoading,
    showSessionExpiredAlert,
    
    // Métodos
    handleLogin,
    handleLogout,
    handleSessionExpired,
    triggerSessionExpired,
    updateSession,
    getLoginUrl
  };
};

