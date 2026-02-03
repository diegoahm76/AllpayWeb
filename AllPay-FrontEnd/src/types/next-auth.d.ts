import NextAuth, { DefaultSession } from 'next-auth';

import { UserToken } from '@/domain/auth/types/user-token.type';
import { Session } from '@/domain/auth/types/session.type';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: UserToken;
    expires: string;
  }

  export interface User {
    nombre_de_usuario?: string;
    nombre?: string;
    tokens?: {
      refresh: string,
      access: string
    };
    persona_2fa?: any;
    permisos?: any[];
    routes?: string[];
  }
}
