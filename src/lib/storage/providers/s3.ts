import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import type { DownloadedFile, StorageProvider, StoredFile } from "../types";
import { buildPathname } from "../path";
import { buildStorageUrl } from "../url";

interface S3Env {
  endpoint?: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

let cachedClient: S3Client | null = null;
let cachedEnvKey: string | null = null;

export function hasS3Config(): boolean {
  return readS3Env() !== null;
}

export const s3StorageProvider: StorageProvider = {
  async upload(file, options): Promise<StoredFile> {
    const env = requireS3Env();
    const originalName =
      "name" in file && typeof file.name === "string" ? file.name : "blob";
    const pathname = buildPathname(options, originalName);
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    await getClient(env).send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: pathname,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: contentType,
      }),
    );

    return {
      url: buildStorageUrl(pathname),
      pathname,
      size: buffer.length,
      contentType,
      uploadedAt: new Date(),
    };
  },

  async download(pathname: string): Promise<DownloadedFile> {
    const env = requireS3Env();
    const result = await getClient(env).send(
      new GetObjectCommand({
        Bucket: env.bucket,
        Key: pathname,
      }),
    );

    return {
      buffer: await bodyToBuffer(result.Body),
      contentType: result.ContentType ?? "application/octet-stream",
      size: result.ContentLength,
    };
  },

  async delete(pathname: string): Promise<void> {
    const env = requireS3Env();
    await getClient(env).send(
      new DeleteObjectCommand({
        Bucket: env.bucket,
        Key: pathname,
      }),
    );
  },
};

function readS3Env(): S3Env | null {
  const endpoint =
    process.env.AWS_ENDPOINT_URL ??
    process.env.AWS_ENDPOINT_URL_S3 ??
    process.env.S3_ENDPOINT;
  const bucket =
    process.env.AWS_S3_BUCKET_NAME ??
    process.env.S3_BUCKET ??
    process.env.STORAGE_BUCKET;
  const region =
    process.env.AWS_DEFAULT_REGION ??
    process.env.AWS_REGION ??
    process.env.S3_REGION ??
    "auto";
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, bucket, region, accessKeyId, secretAccessKey };
}

function requireS3Env(): S3Env {
  const env = readS3Env();
  if (!env) {
    throw new Error("Storage S3 nao configurado");
  }
  return env;
}

function getClient(env: S3Env): S3Client {
  const envKey = JSON.stringify({
    endpoint: env.endpoint,
    region: env.region,
    accessKeyId: env.accessKeyId,
  });
  if (cachedClient && cachedEnvKey === envKey) return cachedClient;

  cachedEnvKey = envKey;
  cachedClient = new S3Client({
    region: env.region,
    endpoint: env.endpoint,
    forcePathStyle: !!env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return cachedClient;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const withArrayBuffer = body as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof withArrayBuffer.arrayBuffer === "function") {
    return Buffer.from(await withArrayBuffer.arrayBuffer());
  }

  const withTransform = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransform.transformToByteArray === "function") {
    return Buffer.from(await withTransform.transformToByteArray());
  }

  throw new Error("Resposta S3 sem corpo legivel");
}
