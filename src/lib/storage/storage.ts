import type { StorageProvider, UploadOptions } from "./types";
import { mockStorageProvider } from "./providers/mock";
import { hasS3Config, s3StorageProvider } from "./providers/s3";
import { isTenantStoragePath, pathnameFromStorageUrl } from "./url";

function pickProvider(): StorageProvider {
  if (hasS3Config()) return s3StorageProvider;
  return mockStorageProvider;
}

let cached: StorageProvider | null = null;

export function storage(): StorageProvider {
  if (!cached) cached = pickProvider();
  return cached;
}

export async function uploadFile(file: File | Blob, options: UploadOptions) {
  return storage().upload(file, options);
}

export async function downloadFile(pathname: string) {
  return storage().download(pathname);
}

export async function downloadFileByUrl(
  url: string,
  options?: { tenantId?: string },
) {
  const pathname = pathnameFromStorageUrl(url);
  if (!pathname) {
    throw new Error("URL fora do storage autorizado");
  }
  if (options?.tenantId && !isTenantStoragePath(pathname, options.tenantId)) {
    throw new Error("Arquivo fora do tenant atual");
  }
  return downloadFile(pathname);
}

export async function deleteFile(pathname: string) {
  return storage().delete(pathname);
}
