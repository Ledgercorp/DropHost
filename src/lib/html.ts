import { normalizeRelativePath } from "./files";

const DIRECT_ATTRIBUTES = ["src", "href", "poster"] as const;

function isExternalOrNonFileReference(reference: string): boolean {
  const value = reference.trim();
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

function splitSuffix(reference: string): { path: string; suffix: string } {
  const queryIndex = reference.indexOf("?");
  const hashIndex = reference.indexOf("#");
  const indexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const suffixIndex = indexes.length > 0 ? Math.min(...indexes) : -1;
  return suffixIndex < 0
    ? { path: reference, suffix: "" }
    : { path: reference.slice(0, suffixIndex), suffix: reference.slice(suffixIndex) };
}

function resolveProjectPath(reference: string, entryPath: string): string | null {
  if (isExternalOrNonFileReference(reference)) return null;

  const { path } = splitSuffix(reference.trim());
  const normalizedEntry = normalizeRelativePath(entryPath);
  const slashIndex = normalizedEntry.lastIndexOf("/");
  const entryDirectory = slashIndex >= 0 ? normalizedEntry.slice(0, slashIndex) : "";

  try {
    return normalizeRelativePath(entryDirectory ? `${entryDirectory}/${path}` : path);
  } catch {
    return null;
  }
}

function rewriteReference(
  reference: string,
  publicUrlsByRelativePath: ReadonlyMap<string, string>,
  entryPath: string,
): string {
  const projectPath = resolveProjectPath(reference, entryPath);
  if (!projectPath) return reference;

  const publicUrl = publicUrlsByRelativePath.get(projectPath);
  if (!publicUrl) return reference;

  const { suffix } = splitSuffix(reference.trim());
  return `${publicUrl}${suffix}`;
}

function splitSrcset(value: string): string[] {
  const candidates: string[] = [];
  let start = 0;
  let dataReference = value.slice(start).trimStart().startsWith("data:");
  let dataDescriptorStarted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (dataReference && /\s/.test(character)) dataDescriptorStarted = true;

    if (character === "," && (!dataReference || dataDescriptorStarted)) {
      candidates.push(value.slice(start, index).trim());
      start = index + 1;
      dataReference = value.slice(start).trimStart().startsWith("data:");
      dataDescriptorStarted = false;
    }
  }

  candidates.push(value.slice(start).trim());
  return candidates.filter(Boolean);
}

function rewriteSrcset(
  value: string,
  publicUrlsByRelativePath: ReadonlyMap<string, string>,
  entryPath: string,
): string {
  return splitSrcset(value)
    .map((candidate) => {
      const match = candidate.match(/^(\S+)(\s+.*)?$/);
      if (!match) return candidate;
      const [, reference, descriptor = ""] = match;
      return `${rewriteReference(reference, publicUrlsByRelativePath, entryPath)}${descriptor}`;
    })
    .join(", ");
}

export function rewriteAssetReferences(
  html: string,
  publicUrlsByRelativePath: ReadonlyMap<string, string>,
  entryPath = "index.html",
): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  for (const element of document.querySelectorAll<HTMLElement>("[src], [href], [poster], [srcset]")) {
    for (const attribute of DIRECT_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current !== null) {
        element.setAttribute(
          attribute,
          rewriteReference(current, publicUrlsByRelativePath, entryPath),
        );
      }
    }

    const srcset = element.getAttribute("srcset");
    if (srcset !== null) {
      element.setAttribute(
        "srcset",
        rewriteSrcset(srcset, publicUrlsByRelativePath, entryPath),
      );
    }
  }

  const doctype = html.match(/<!doctype[^>]*>/i)?.[0];
  return `${doctype ? `${doctype}\n` : ""}${document.documentElement.outerHTML}`;
}
