const STORAGE_ROUTE_PREFIX = "/api/storage/";

export function buildStorageUrl(pathname: string): string {
  return `${STORAGE_ROUTE_PREFIX}${pathname
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/")}`;
}

export function pathnameFromStorageUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.startsWith("data:")) return null;

  if (raw.startsWith("s3://")) {
    try {
      return cleanPathname(new URL(raw).pathname);
    } catch {
      return null;
    }
  }

  if (raw.startsWith(STORAGE_ROUTE_PREFIX)) {
    return cleanPathname(raw.slice(STORAGE_ROUTE_PREFIX.length));
  }

  if (raw.startsWith("tenants/")) {
    return cleanPathname(raw);
  }

  try {
    const parsed = raw.startsWith("/")
      ? new URL(raw, "https://nexus.local")
      : new URL(raw);
    if (parsed.pathname.startsWith(STORAGE_ROUTE_PREFIX)) {
      return cleanPathname(parsed.pathname.slice(STORAGE_ROUTE_PREFIX.length));
    }
  } catch {
    return null;
  }

  return null;
}

export function isStorageUrl(value: string): boolean {
  return pathnameFromStorageUrl(value) !== null;
}

export function isTenantStoragePath(
  pathname: string,
  tenantId: string,
): boolean {
  return pathname.startsWith(`tenants/${sanitizePathSegment(tenantId)}/`);
}

function cleanPathname(value: string): string | null {
  const decoded = value
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join("/");

  if (!decoded || decoded.split("/").some((part) => part === "..")) {
    return null;
  }
  return decoded;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
