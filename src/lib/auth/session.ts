/**
 * Helpers de sessão e autorização.
 *
 * Convenções:
 * - `requireAuth()` em qualquer área protegida — redireciona pra /entrar com callbackUrl.
 * - `requireRole(...)` quando a rota é restrita a papéis específicos —
 *   redireciona pra /entrar (papel errado é tratado como não autorizado;
 *   evita vazar a existência da rota).
 * - `getLayerHomePath(role)` define onde cada papel "mora" pós-login.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "./config";
import type { NexusSessionUser, UserRole } from "./types";
import { getLayerHomePath } from "./session-paths";

export { LAYER_HOME, getLayerHomePath } from "./session-paths";

async function currentPathname(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/";
}

export async function requireAuth(): Promise<NexusSessionUser> {
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = await currentPathname();
    redirect(`/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user;
}

export async function requireRole(
  ...allowed: UserRole[]
): Promise<NexusSessionUser> {
  const user = await requireAuth();
  if (!allowed.includes(user.role)) {
    redirect(getLayerHomePath(user.role));
  }
  return user;
}
