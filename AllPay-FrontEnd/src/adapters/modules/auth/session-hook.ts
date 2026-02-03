/**
 * @deprecated Este hook está siendo reemplazado por useAuthContext de @/providers/AuthProvider
 * Se mantiene por compatibilidad con código existente, pero se recomienda migrar a useAuthContext
 */
import { useAuthContext } from '@/providers/AuthProvider';

import { ISessionHook } from './interface/session-hook.interface';

/**
 * Hook de sesión (versión legacy)
 * Ahora usa el sistema unificado de autenticación internamente
 * 
 * @deprecated Usa useAuthContext() en su lugar
 */
export const SessionHook = (): ISessionHook => {
  const { sessionToken, updateSession } = useAuthContext();

  const Update = async (data: any): Promise<void> => {
    await updateSession(data);
  };

  return { 
    sessionToken, 
    Update 
  };
};
