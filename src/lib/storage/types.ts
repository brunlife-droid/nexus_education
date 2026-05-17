export type StorageKind = "image" | "audio" | "document" | "logo";

export interface StoredFile {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface DownloadedFile {
  buffer: Buffer;
  contentType: string;
  size?: number;
}

export interface UploadOptions {
  tenantId: string;
  kind: StorageKind;
  /** Identificador do dono logico, como studentId, conversationId ou classId. */
  ownerId?: string;
  /** Sobrescrever nome do arquivo quando for preciso nome deterministico. */
  filename?: string;
  /** Mantido no contrato para providers que tenham URLs assinadas. */
  privateAccess?: boolean;
}

export interface StorageProvider {
  upload(file: File | Blob, options: UploadOptions): Promise<StoredFile>;
  download(pathname: string): Promise<DownloadedFile>;
  delete(pathname: string): Promise<void>;
}
