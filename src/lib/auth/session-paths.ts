/**
 * Paths "home" por papel. Módulo client-safe (sem imports de server-only).
 * Server helpers (requireAuth, requireRole) reimportam daqui em session.ts.
 */

import type { UserRole } from "./types";

export const LAYER_HOME: Record<UserRole, string> = {
  aluno: "/aluno/chat",
  responsavel: "/aluno/chat",
  professor: "/professor",
  coordenador: "/professor",
  diretor: "/professor",
  orientador: "/professor",
  secretaria: "/secretaria",
  admin_nexus: "/admin",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  aluno: "Aluno",
  responsavel: "Responsável",
  professor: "Professor",
  coordenador: "Coordenador",
  diretor: "Diretor",
  orientador: "Orientador",
  secretaria: "Secretaria",
  admin_nexus: "Admin Nexus",
};

export function getLayerHomePath(role: UserRole): string {
  return LAYER_HOME[role] ?? "/";
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? "Usuário";
}
