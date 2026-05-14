export type UserRole =
  | "aluno"
  | "responsavel"
  | "professor"
  | "coordenador"
  | "diretor"
  | "orientador"
  | "secretaria"
  | "admin_nexus";

export interface NexusSessionUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  role: UserRole;
  tenantId: string;
}

declare module "next-auth" {
  interface Session {
    user: NexusSessionUser;
  }

  interface User {
    role?: UserRole;
    tenantId?: string;
  }
}

