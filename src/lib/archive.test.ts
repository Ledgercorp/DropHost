import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { prepareLooseFiles, prepareZip, SitePreparationError } from "./archive";

async function zipFile(entries: Record<string, string>, name = "site.zip"): Promise<File> {
  const zip = new JSZip();
  for (const [path, contents] of Object.entries(entries)) zip.file(path, contents);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes], name, { type: "application/zip" });
}

describe("prepareZip", () => {
  it("prefers a root index and excludes it from supporting assets", async () => {
    const file = await zipFile({
      "index.html": "<h1>Root</h1>",
      "nested/index.html": "<h1>Nested</h1>",
      "assets/site.css": "body{}",
      ".DS_Store": "metadata",
      "__MACOSX/._index.html": "metadata",
    });

    const prepared = await prepareZip(file);

    expect(prepared.entryPath).toBe("index.html");
    expect(prepared.entryHtml).toBe("<h1>Root</h1>");
    expect(prepared.assets.map((asset) => asset.relativePath)).toEqual([
      "assets/site.css",
      "nested/index.html",
    ]);
  });

  it("accepts a nested index when it is the only entry document", async () => {
    const prepared = await prepareZip(await zipFile({
      "portfolio/index.html": "<h1>Portfolio</h1>",
      "portfolio/app.js": "console.log('ok')",
    }));

    expect(prepared.entryPath).toBe("portfolio/index.html");
    expect(prepared.entryHtml).toContain("Portfolio");
    expect(prepared.assets[0]).toMatchObject({
      relativePath: "portfolio/app.js",
      mimeType: "text/javascript",
    });
  });

  it("returns a typed error when the archive has no HTML entry", async () => {
    await expect(prepareZip(await zipFile({ "styles.css": "body{}" }))).rejects.toMatchObject({
      code: "ENTRY_HTML_MISSING",
    });
  });

  it("returns a typed error for malformed ZIP bytes", async () => {
    const invalid = new File(["not a zip"], "broken.zip", { type: "application/zip" });
    await expect(prepareZip(invalid)).rejects.toMatchObject({ code: "INVALID_ARCHIVE" });
  });

  it("rejects traversal from the original ZIP entry name", async () => {
    const file = await zipFile({
      "index.html": "<h1>Safe</h1>",
      "../../escape.js": "alert('escape')",
    });

    await expect(prepareZip(file)).rejects.toMatchObject({ code: "UNSAFE_ARCHIVE_PATH" });
  });
});

describe("prepareLooseFiles", () => {
  it("uses browser directory-relative paths when available", async () => {
    const entry = new File(["<h1>Loose</h1>"], "index.html", { type: "text/html" });
    const asset = new File(["body{}"], "site.css", { type: "text/css" });
    Object.defineProperty(entry, "webkitRelativePath", { value: "demo/index.html" });
    Object.defineProperty(asset, "webkitRelativePath", { value: "demo/styles/site.css" });

    const prepared = await prepareLooseFiles([asset, entry]);

    expect(prepared.entryPath).toBe("demo/index.html");
    expect(prepared.entryHtml).toBe("<h1>Loose</h1>");
    expect(prepared.assets[0].relativePath).toBe("demo/styles/site.css");
  });

  it("uses SitePreparationError for caller-readable codes", () => {
    const error = new SitePreparationError("INVALID_ARCHIVE", "Invalid ZIP file");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("INVALID_ARCHIVE");
  });
});
