import NextAuth, { Session, User } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';
import { Path } from '@/application/shared/path.enum';
import { Credentials } from '@/domain/auth/types/credentials.type';
import { AUTH_SECRET, NODE_ENV, BASE_API_URL, AUTH_URL, BASE_URL } from '@/environment';

/**
 * Obtiene la URL base correcta considerando el entorno
 * En producción usa BASE_URL, en desarrollo usa localhost
 */
export const getBaseUrl = (): string => {
  // Prioridad: BASE_URL > NEXTAUTH_URL > localhost
  if (AUTH_URL && AUTH_URL.trim() !== '') {
    return AUTH_URL.trim();
  }  
  
  if (BASE_URL && BASE_URL.trim() !== '') {
    return BASE_URL.trim();
  }   
  
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.trim();
  }
  
  // Fallback para desarrollo
  return NODE_ENV === 'production' 
    ? 'https://recaudosfondonacionaldelcacao.com' 
    : 'http://localhost:3000';
};

export const { auth, signIn, signOut, unstable_update, handlers } = NextAuth({
  // CRÍTICO para ECS/Fargate: trustHost debe ser true cuando hay proxies
  trustHost: true,
  
  // CRÍTICO: URL base para Auth.js v5
  // En Auth.js v5, AUTH_URL está deprecado, usa NEXTAUTH_URL o BASE_URL
  basePath: '/api/auth',
  
  // Configuración de cookies para ECS/Producción
  // Esto asegura que las cookies se establezcan correctamente en entornos con proxies
  cookies: {
    sessionToken: {
      name: `${NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: NODE_ENV === 'production', // Solo en HTTPS en producción
        // No establecer domain explícitamente para permitir que el navegador lo maneje
        // Esto es importante en ECS donde puede haber múltiples subdominios
      },
    },
    callbackUrl: {
      name: `${NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: NODE_ENV === 'production',
      },
    },
  },
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      async authorize(credentials: Partial<Record<string, unknown>>): Promise<User | null> {
        // Log INMEDIATO al inicio - esto debe aparecer SIEMPRE
        console.log('[AUTH] ⚡ authorize INICIADO', {
          timestamp: new Date().toISOString(),
          hasCredentials: !!credentials,
          credentialsKeys: credentials ? Object.keys(credentials) : [],
          environment: NODE_ENV
        });
        
        try {
          const payload = credentials as Credentials;
          
          console.log('[AUTH] authorize ejecutado', {
            user: payload.user,
            hasPassword: !!payload.password,
            apiUrl: BASE_API_URL,
            hasBaseApiUrl: !!BASE_API_URL,
            baseApiUrlValue: BASE_API_URL || 'UNDEFINED'
          });
          
          // Validar que BASE_API_URL esté configurada
          if (!BASE_API_URL) {
            console.error('[AUTH] ❌ BASE_API_URL no está configurada', {
              envVars: {
                hasBaseApiUrl: !!BASE_API_URL,
                nodeEnv: NODE_ENV,
                authUrl: AUTH_URL || 'UNDEFINED',
                baseUrl: BASE_URL || 'UNDEFINED'
              }
            });
            throw new Error('BASE_API_URL no está configurada en las variables de entorno');
          }
          
          const loginUrl = `${BASE_API_URL}users/login/`;
          console.log('[AUTH] Llamando a API de login:', loginUrl);
          
          const response = await axios.post(loginUrl, {
            nombre_de_usuario: payload.user,
            password: payload.password
          }, {
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            withCredentials: true
          }).catch((error) => {
            console.error('[AUTH] Error en petición de autenticación:', {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data
            });
            return error.response;
          });

          console.log('[AUTH] Respuesta de API:', {
            hasResponse: !!response,
            success: response?.data?.success,
            hasData: !!response?.data?.data,
            dataKeys: response?.data?.data ? Object.keys(response.data.data) : [],
            hasTokens: !!response?.data?.data?.tokens,
            tokensKeys: response?.data?.data?.tokens ? Object.keys(response.data.data.tokens) : []
          });

          if (!response || response.data.success === false) {
            console.error('[AUTH] ❌ Autenticación fallida:', {
              success: response?.data?.success,
              detail: response?.data?.detail
            });
            throw new Error(response?.data?.detail || 'Error de autenticación');
          }
          
          const user = response.data.data as User;
          
          // Log detallado de la estructura del usuario recibido
          console.log('[AUTH] ✅ Usuario autorizado:', {
            userId: user?.id,
            hasTokens: !!user?.tokens,
            hasAccessToken: !!user?.tokens?.access,
            userKeys: Object.keys(user),
            tokensStructure: user?.tokens ? {
              keys: Object.keys(user.tokens),
              hasAccess: !!user.tokens.access,
              hasRefresh: !!user.tokens.refresh
            } : null,
            // Log completo para debugging en producción
            fullResponse: NODE_ENV === 'production' ? JSON.stringify(user, null, 2).substring(0, 500) : undefined
          });
          
          return user;
        } catch (error) {
          // Log DETALLADO del error - esto es crítico para debugging
          console.error('[AUTH] ❌ Excepción en authorize:', {
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            hasBaseApiUrl: !!BASE_API_URL,
            baseApiUrl: BASE_API_URL || 'UNDEFINED'
          });
          
          // IMPORTANTE: Retornar null causa CredentialsSignin
          // Pero ahora tenemos logs detallados del por qué
          return null;
        }
      }
    })
  ],
  debug: NODE_ENV === 'development',
  pages: {
    signIn: Path.Login,
    error: Path.Login
  },
  events: {
    async signIn({ user, account }) {
      console.log('[AUTH] Event: signIn', {
        hasUser: !!user,
        userId: (user as any)?.id,
        accountProvider: account?.provider
      });
    },
    async signOut() {
      console.log('[AUTH] Event: signOut');
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 1 * 24 * 60 * 60
  },
  jwt: {
    maxAge: 1 * 24 * 60 * 60
  },
  secret: AUTH_SECRET,
  callbacks: {
    async signIn(params): Promise<boolean | string> {
      try {
        console.log('[AUTH] signIn callback ejecutado', {
          hasUser: !!params.user,
          userKeys: params.user ? Object.keys(params.user) : [],
          account: params.account ? {
            provider: params.account.provider,
            type: params.account.type
          } : null,
          profile: params.profile ? Object.keys(params.profile) : []
        });
        
        const user = params.user as User;
        
        // Log detallado del usuario
        console.log('[AUTH] Datos completos del usuario:', {
          userId: user?.id,
          userName: (user as any)?.nombre_de_usuario,
          hasTokens: !!user?.tokens,
          hasAccessToken: !!user?.tokens?.access,
          hasRefreshToken: !!user?.tokens?.refresh,
          tokensKeys: user?.tokens ? Object.keys(user.tokens) : [],
          userObject: user ? JSON.stringify(user, null, 2).substring(0, 1000) : 'null'
        });
        
        if (!user) {
          console.error('[AUTH] signIn callback: ❌ Usuario es null/undefined');
          return false;
        }
        
        // Verificar si el usuario tiene tokens de alguna forma
        // Algunas APIs pueden devolver los tokens en diferentes estructuras
        const hasAccessToken = 
          user.tokens?.access || 
          (user as any)?.access_token || 
          (user as any)?.accessToken ||
          (user as any)?.token;
        
        if (!hasAccessToken) {
          console.error('[AUTH] signIn callback: ❌ Usuario no tiene access token', {
            tokens: user.tokens,
            tokensKeys: user.tokens ? Object.keys(user.tokens) : [],
            userKeys: Object.keys(user),
            // Log completo del objeto usuario para debugging
            fullUser: JSON.stringify(user, null, 2)
          });
          
          // En producción, permitir el login si el usuario existe (para debugging)
          // Esto ayuda a identificar problemas de estructura de datos
          if (NODE_ENV === 'production') {
            console.warn('[AUTH] ⚠️  PRODUCCIÓN: Permitiendo login sin token para debugging');
            console.warn('[AUTH] ⚠️  Esto debe corregirse - verificar estructura de respuesta de API');
          }
          
          // Retornar false para rechazar el login
          return false;
        }
        
        console.log('[AUTH] signIn callback: ✅ Usuario autorizado (tiene access token)');
        return true;
      } catch (error) {
        console.error('[AUTH] ❌ Excepción en signIn callback:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return false;
      }
    },
    async jwt({ token, user }: { token: JWT; user: User }): Promise<null | JWT> {
      console.log('[AUTH] jwt callback ejecutado', {
        hasUser: !!user,
        hasToken: !!token,
        tokenKeys: token ? Object.keys(token) : []
      });
      
      if (user) {
        console.log('[AUTH] Agregando datos de usuario al token:', {
          userId: user.id,
          hasPermissions: !!user.permisos,
          hasPersona2fa: !!user.persona_2fa
        });
        
        token.id = user.id;
        token.user = user;
        token.permissions = user.permisos;
        token.persona_2fa = user.persona_2fa || [];
      }
      
      console.log('[AUTH] Token final:', {
        hasId: !!token.id,
        hasUser: !!token.user,
        hasPermissions: !!token.permissions
      });
      
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      const sessionStartTime = Date.now();
      console.log('[AUTH] 🔄 session callback ejecutado', {
        hasToken: !!token,
        hasTokenUser: !!token.user,
        hasTokenId: !!token.id,
        tokenKeys: token ? Object.keys(token) : [],
        sessionKeys: session ? Object.keys(session) : [],
        timestamp: new Date().toISOString()
      });
      
      // Si el token no tiene usuario ni id, la sesión no es válida
      // Esto puede ocurrir cuando las cookies no están sincronizadas o el token no se ha establecido correctamente
      if (!token.user && !token.id) {
        console.error('[AUTH] ❌ PROBLEMA DETECTADO: Token no tiene usuario ni id asignado - sesión inválida', {
          tokenStructure: {
            keys: token ? Object.keys(token) : [],
            hasSub: !!token?.sub,
            hasJti: !!token?.jti,
            hasExp: !!token?.exp
          },
          sessionStructure: {
            hasUser: !!session?.user,
            hasExpires: !!session?.expires,
            keys: session ? Object.keys(session) : []
          },
          timestamp: new Date().toISOString(),
          environment: NODE_ENV
        });
        // Devolver sesión vacía pero válida - NextAuth manejará esto como no autenticado
        // Esto evita que devuelva null y cause problemas en el cliente
        const invalidSession = {
          ...session,
          user: undefined as any,
          expires: new Date(Date.now() - 1000).toISOString() // Sesión expirada
        };
        console.log('[AUTH] 📤 Devolviendo sesión inválida (sin null):', {
          hasUser: !!invalidSession.user,
          expires: invalidSession.expires,
          willReturnNull: false,
          processingTime: `${Date.now() - sessionStartTime}ms`
        });
        return invalidSession;
      }
      
      // Si hay usuario en el token, asignarlo a la sesión
      if (token.user) {
        session.user = token.user;
      } else if (token.id) {
        // Si solo hay id pero no el objeto usuario completo, intentar mantener la sesión existente
        // Esto puede ocurrir en casos de sincronización de cookies
        console.warn('[AUTH] ⚠️ ADVERTENCIA: Token tiene id pero no objeto usuario completo', {
          tokenId: token.id,
          hasSessionUser: !!session?.user,
          timestamp: new Date().toISOString(),
          environment: NODE_ENV
        });
        // Si la sesión no tiene usuario, mantener la sesión pero marcarla como inválida
        if (!session?.user) {
          console.error('[AUTH] ❌ PROBLEMA DETECTADO: Sesión no tiene usuario y token solo tiene id', {
            tokenId: token.id,
            sessionKeys: session ? Object.keys(session) : [],
            timestamp: new Date().toISOString(),
            environment: NODE_ENV
          });
          const invalidSession = {
            ...session,
            user: undefined as any,
            expires: new Date(Date.now() - 1000).toISOString() // Sesión expirada
          };
          console.log('[AUTH] 📤 Devolviendo sesión inválida (sin null):', {
            hasUser: !!invalidSession.user,
            expires: invalidSession.expires,
            willReturnNull: false,
            processingTime: `${Date.now() - sessionStartTime}ms`
          });
          return invalidSession;
        }
      }
      
      // Asegurar que la sesión tenga expires si no lo tiene
      if (!session.expires) {
        const expiresDate = new Date();
        expiresDate.setTime(expiresDate.getTime() + (1 * 24 * 60 * 60 * 1000)); // 24 horas
        session.expires = expiresDate.toISOString();
      }
         
      return session;
    },
    // El callback authorized está deshabilitado porque la lógica de autorización
    // se maneja directamente en el middleware (src/middleware.ts)
    // Esto previene bucles de redirección en /api/auth/*
    // authorized(params): boolean | Response {
    //   return true;
    // }
  }
});