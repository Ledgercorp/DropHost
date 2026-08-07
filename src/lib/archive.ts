export type SitePreparationErrorCode =
  | "INVALID_ARCHIVE"
  | "ENTRY_HTML_MISSING"
  | "UNSAFE_ARCHIVE_PATH";

export class SitePreparationError extends Error {
  constructor(
    public readonly code: SitePreparationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SitePreparationError";
  }
}

export type PreparedSiteFile = {
  relativePath: string;
  file: File;
  mimeType: string;
};

export type PreparedSite = {
  entryPath: string;
  entryHtml: string;
  assets: PreparedSiteFile[];
};

function chooseEntryPath(paths: string[]): string {
  const htmlPaths = paths.filter((path) => /\.html?$/i.test(path));
  if (htmlPaths.length === 0) {
    throw new SitePreparationError("ENTRY_HTML_MISSING", "No HTML entry file was found");
  }

  return [...htmlPaths].sort((left, right) => {
    const leftRootIndex = /^index\.html?$/i.test(left);
    const rightRootIndex = /^index\.html?$/i.test(right);
    if (leftRootIndex !== rightRootIndex) return leftRootIndex ? -1 : 1;

    const leftIndex = /(^|\/)index\.html?$/i.test(left);
    const rightIndex = /(^|\/)index\.html?$/i.test(right);
    if (leftIndex !== rightIndex) return leftIndex ? -1 : 1;

    const depthDifference = left.split("/").length - right.split("/").length;
    return depthDifference || left.localeCompare(right);
  })[0];
}

function validateZipEntry(entry: JSZipObject): string {
  const originalName = entry.unsafeOriginalName ?? entry.name;
  try {
    return normalizeRelativePath(originalName);
  } catch {
    throw new SitePreparationError(
      "UNSAFE_ARCHIVE_PATH",
      `Unsafe ZIP path: ${originalName}`,
    );
  }
}

async function blobText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") return blob.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(blob);
  });
}

async function blobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

export async function prepareZip(file: File): Promise<PreparedSite> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await blobArrayBuffer(file));
  } catch {
    throw new SitePreparationError("INVALID_ARCHIVE", "Invalid ZIP file");
  }

  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => ({ entry, relativePath: validateZipEntry(entry) }))
    .filter(({ relativePath }) => !isIgnoredPath(relativePath))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const entryPath = chooseEntryPath(entries.map(({ relativePath }) => relativePath));
  const entry = entries.find(({ relativePath }) => relativePath === entryPath)?.entry;
  if (!entry) {
    throw new SitePreparationError("ENTRY_HTML_MISSING", "No HTML entry file was found");
  }

  const entryHtml = await entry.async("string");
  const assets = await Promise.all(
    entries
      .filter(({ relativePath }) => relativePath !== entryPath)
      .map(async ({ entry: assetEntry, relativePath }) => {
        const mimeType = detectMimeType(relativePath);
        const bytes = await assetEntry.async("uint8array");
        return {
          relativePath,
          mimeType,
          file: new File([bytes], relativePath.split("/").pop()!, { type: mimeType }),
        } satisfies PreparedSiteFile;
      }),
  );

  return { entryPath, entryHtml, assets };
}

export async function prepareLooseFiles(files: File[]): Promise<PreparedSite> {
  const prepared = files
    .map((file) => {
      const browserPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const relativePath = normalizeRelativePath(browserPath || file.name);
      return { file, relativePath };
    })
    .filter(({ relativePath }) => !isIgnoredPath(relativePath))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const entryPath = chooseEntryPath(prepared.map(({ relativePath }) => relativePath));
  const entry = prepared.find(({ relativePath }) => relativePath === entryPath);
  if (!entry) {
    throw new SitePreparationError("ENTRY_HTML_MISSING", "No HTML entry file was found");
  }

  const entryHtml = await blobText(entry.file);
  const assets = prepared
    .filter(({ relativePath }) => relativePath !== entryPath)
    .map(({ file, relativePath }) => ({
      relativePath,
      file,
      mimeType: file.type || detectMimeType(relativePath),
    }));

  return { entryPath, entryHtml, assets };
}
import JSZip, { type JSZipObject } from "jszip";
import { detectMimeType, isIgnoredPath, normalizeRelativePath } from "./files";
