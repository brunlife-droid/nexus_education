import type { StorageProvider, StoredFile } from "../types";
import { buildPathname } from "../path";

export const mockStorageProvider: StorageProvider = {
  async upload(file, options): Promise<StoredFile> {
    const originalName =
      "name" in file && typeof file.name === "string" ? file.name : "blob";
    const pathname = buildPathname(options, originalName);

    let url = `https://placehold.co/600x400/EEE/333?text=${encodeURIComponent(
      `mock-${originalName}`,
    )}`;

    if (file.size < 1024 * 1024 && file.type.startsWith("image/")) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        url = `data:${file.type};base64,${base64}`;
      } catch {
        // Mantem placeholder.
      }
    }

    return {
      url,
      pathname,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      uploadedAt: new Date(),
    };
  },

  async download(): Promise<never> {
    throw new Error("Storage mock nao persiste arquivos");
  },

  async delete(): Promise<void> {
    // no-op
  },
};
