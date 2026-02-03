import { Permission } from './permission.type';
export type Role = {
  id?: string;
  name?: string;
  permissions?: Permission[];
};
