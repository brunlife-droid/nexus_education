/**
 * Usuários demo hard-coded para Fase 0.
 *
 * Em produção, autenticação vem do DB (tabela `users` via Drizzle Adapter).
 * Aqui é uma whitelist mínima pra permitir login sem DB.
 *
 * Senhas em plain text propositais — é só Fase 0. NUNCA replicar em produção.
 */

import type { UserRole } from "./types";

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  image?: string;
  role: UserRole;
  tenantId: string;
  layerHomePath: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u-joao",
    email: "joao@alfenas.demo",
    password: "demo123",
    name: "João Pedro Silva",
    role: "aluno",
    tenantId: "alfenas",
    layerHomePath: "/aluno/chat",
  },
  {
    id: "u-ricardo",
    email: "ricardo@alfenas.demo",
    password: "demo123",
    name: "Ricardo Marques",
    role: "professor",
    tenantId: "alfenas",
    layerHomePath: "/professor",
  },
  {
    id: "u-claudia",
    email: "claudia@alfenas.demo",
    password: "demo123",
    name: "Cláudia Resende",
    role: "secretaria",
    tenantId: "alfenas",
    layerHomePath: "/secretaria",
  },
  {
    id: "u-bruno",
    email: "bruno@nexus.education",
    password: "demo123",
    name: "Bruno Andrade",
    role: "admin_nexus",
    tenantId: "alfenas",
    layerHomePath: "/admin",
  },
];

export function findDemoUser(
  email: string,
  password: string,
): DemoUser | null {
  return (
    DEMO_USERS.find((u) => u.email === email && u.password === password) ??
    null
  );
}
