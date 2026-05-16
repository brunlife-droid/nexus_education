import { put, del } from "@vercel/blob";
import type { StorageProvider, StoredFile } from "../types";
import { buildPathname } from "../path";

/**
 * Vercel Blob provider.
 *
 * Requer BLOB_READ_WRITE_TOKEN no ambiente (Vercel injeta automaticamente
 * quando um Blob Store é provisionado em Project Settings → Storage).
 */

export const vercelBlobProvider: StorageProvider = {
  async upload(file, options): Promise<StoredFile> {
    const originalName = file instanceof File ? file.name : "blob";
    const pathname = buildPathname(options, originalName);
    const result = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false, // já temos randomToken no pathname
      contentType: file.type || undefined,
    });

    return {
      url: result.url,
      pathname: result.pathname,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      uploadedAt: new Date(),
    };
  },

  async delete(pathname: string): Promise<void> {
    await del(pathname);
  },
};
