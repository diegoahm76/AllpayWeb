import { Role } from "@/domain/user/types/role.type";

export type UserToken = {
  id?: string;
  name?: string;
  email?: string;
  token?: string | null;
  role?: Role;
  permissions?: any[];
  persona_2fa?: any;
};
