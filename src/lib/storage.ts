import path from "node:path";
import { mkdir, readFile as fsReadFile, unlink, writeFile as fsWriteFile } from "node:fs/promises";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { UPLOADS_DIR } from "@/lib/uploads";

// Same private-file model either way: uploads are never served from a
// public bucket/URL directly (that would bypass the app's own membership
// checks on group photos) - the app always reads the bytes itself and
// streams them back through its existing authenticated routes. S3/MinIO
// is just a different place those bytes live.
const s3Bucket = process.env.S3_BUCKET;
const s3Client =
  process.env.S3_ENDPOINT && s3Bucket
    ? new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "us-east-1",
        forcePathStyle: true, // required for MinIO and most non-AWS S3-compatible servers
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
        },
      })
    : null;

export const usingS3Storage = s3Client != null;

export async function storageWriteFile(relativePath: string, data: Buffer): Promise<void> {
  if (s3Client) {
    await s3Client.send(new PutObjectCommand({ Bucket: s3Bucket, Key: relativePath, Body: data }));
    return;
  }
  const fullPath = path.join(UPLOADS_DIR, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await fsWriteFile(fullPath, data);
}

export async function storageReadFile(relativePath: string): Promise<Buffer | null> {
  if (s3Client) {
    try {
      const res = await s3Client.send(new GetObjectCommand({ Bucket: s3Bucket, Key: relativePath }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }
  try {
    return await fsReadFile(path.join(UPLOADS_DIR, relativePath));
  } catch {
    return null;
  }
}

export async function storageDeleteFile(relativePath: string): Promise<void> {
  if (s3Client) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: relativePath })).catch(() => {});
    return;
  }
  await unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => {});
}
