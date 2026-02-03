import { Role } from './role.type';
export type User = {
  id?: string;
  name?: string;
  email?: string;
  roleId?: string;
  active?: string;
  role?: Role;
  created?: string;
};
