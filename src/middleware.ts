import { NextResponse, type NextRequest } from "next/server";

const TENANT_IDS = ["alfenas", "pousoalegre", "varginha"] as const;
type TenantId = (typeof TENANT_IDS)[number];

function isTenantId(v: string | null | undefined): v is TenantId {
  return !!v && (TENANT_IDS as readonly string[]).includes(v);
}

/**
 * Resolve o tenant da requisição na seguinte ordem de prioridade:
 *
 * 1. Query param `?tenant=X` (sobrescreve cookie e seta novo cookie)
 * 2. Cookie `tenant`
 * 3. Subdomínio (em produção: alfenas.nexus.edu)
 * 4. Default (alfenas)
 *
 * O id resolvido é injetado em `x-tenant-id` (lido em Server Components).
 */
export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const queryTenant = url.searchParams.get("tenant");
  const cookieTenant = request.cookies.get("tenant")?.value;
  const subdomainTenant = extractSubdomain(request.headers.get("host"));

  let resolved: TenantId = "alfenas";
  let shouldSetCookie = false;

  if (isTenantId(queryTenant)) {
    resolved = queryTenant;
    shouldSetCookie = queryTenant !== cookieTenant;
  } else if (isTenantId(cookieTenant)) {
    resolved = cookieTenant;
  } else if (isTenantId(subdomainTenant)) {
    resolved = subdomainTenant;
    shouldSetCookie = true;
  }

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        "x-tenant-id": resolved,
      }),
    },
  });

  if (shouldSetCookie) {
    response.cookies.set("tenant", resolved, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0];
  if (
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return null;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  return parts[0] ?? null;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto:
     * - _next/static, _next/image (assets)
     * - favicon.ico
     * - arquivos públicos (svg, png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
