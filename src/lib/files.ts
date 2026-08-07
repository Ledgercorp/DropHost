const MIME_BY_EXTENSION: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  txt: "text/plain",
  xml: "application/xml",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
};

export function isIgnoredPath(path: string): boolean {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.some(
    (part) => part === "__MACOSX" || part === ".DS_Store" || part.startsWith("._"),
  );
}

export function detectMimeType(path: string): string {
  const filename = path.split(/[\\/]/).pop() ?? "";
  const extension = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export function normalizeRelativePath(path: string): string {
  if (!path || path.includes("\0")) {
    throw new Error("Unsafe project path");
  }

  const slashPath = path.replace(/\\/g, "/");
  if (slashPath.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(slashPath)) {
    throw new Error("Unsafe project path");
  }

  const normalized: string[] = [];
  for (const part of slashPath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (normalized.length === 0) throw new Error("Unsafe project path");
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }

  if (normalized.length === 0) throw new Error("Unsafe project path");
  return normalized.join("/");
}
