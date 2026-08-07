import { describe, expect, it } from "vitest";
import { detectMimeType, isIgnoredPath, normalizeRelativePath } from "./files";

describe("file path helpers", () => {
  it("filters platform metadata but keeps project files", () => {
    expect(isIgnoredPath("__MACOSX/._index.html")).toBe(true);
    expect(isIgnoredPath(".DS_Store")).toBe(true);
    expect(isIgnoredPath("nested/.DS_Store")).toBe(true);
    expect(isIgnoredPath("assets/app.js")).toBe(false);
  });

  it("normalizes a safe project-relative path", () => {
    expect(normalizeRelativePath("./assets/../assets/logo.png")).toBe("assets/logo.png");
    expect(normalizeRelativePath("styles/site.css")).toBe("styles/site.css");
  });

  it.each([
    ["../../escape.js"],
    ["/absolute/file.js"],
    ["https://example.com/a.js"],
    ["assets/\0bad.js"],
  ])("rejects an unsafe archive-relative path %s", (path) => {
    expect(() => normalizeRelativePath(path)).toThrow("Unsafe project path");
  });
});

describe("detectMimeType", () => {
  it.each([
    ["styles/site.css", "text/css"],
    ["assets/app.js", "text/javascript"],
    ["images/logo.svg", "image/svg+xml"],
    ["images/photo.jpg", "image/jpeg"],
    ["fonts/site.woff2", "font/woff2"],
    ["data/config.json", "application/json"],
    ["unknown.bin", "application/octet-stream"],
  ])("maps %s to %s", (path, expected) => {
    expect(detectMimeType(path)).toBe(expected);
  });
});
