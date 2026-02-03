import { UserToken } from '@/domain/auth/types/user-token.type';

export interface ISessionHook {
  sessionToken: UserToken | null;
  Update(data: UserToken): Promise<void>;
}
