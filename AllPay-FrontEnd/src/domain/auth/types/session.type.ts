import { UserToken } from './user-token.type';
export type Session = {
  user?: UserToken | undefined;
  expires?: string | undefined;
};
