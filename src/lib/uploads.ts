import path from "node:path";

// Absolute path on disk where uploaded files live. Mounted as a Docker
// volume in production (docker-compose.yml) so uploads survive container
// restarts/redeploys. Kept statically scoped under cwd (not env-configurable)
// so Next's build tracer can scope the standalone output correctly instead
// of tracing the whole project.
export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForImageType(mimeType: string): string | null {
  return ALLOWED_IMAGE_TYPES[mimeType] ?? null;
}
