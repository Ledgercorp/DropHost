import { describe, expect, it } from "vitest";
import { rewriteAssetReferences } from "./html";

describe("rewriteAssetReferences", () => {
  it("rewrites local src, href, poster, and srcset references", () => {
    const html = `
      <link rel="stylesheet" href="styles/site.css?v=2">
      <img src="images/a.png" srcset="images/a.png 1x, images/a@2x.png 2x">
      <video poster="images/poster.jpg"></video>
    `;
    const urls = new Map([
      ["styles/site.css", "https://cdn.example/site.css"],
      ["images/a.png", "https://cdn.example/a.png"],
      ["images/a@2x.png", "https://cdn.example/a2.png"],
      ["images/poster.jpg", "https://cdn.example/poster.jpg"],
    ]);

    const output = rewriteAssetReferences(html, urls, "index.html");

    expect(output).toContain('href="https://cdn.example/site.css?v=2"');
    expect(output).toContain('src="https://cdn.example/a.png"');
    expect(output).toContain("https://cdn.example/a.png 1x, https://cdn.example/a2.png 2x");
    expect(output).toContain('poster="https://cdn.example/poster.jpg"');
  });

  it("resolves paths relative to a nested entry document", () => {
    const html = `<script src="scripts/app.js"></script><img src="../shared/logo.png">`;
    const urls = new Map([
      ["demo/scripts/app.js", "https://cdn.example/app.js"],
      ["shared/logo.png", "https://cdn.example/logo.png"],
    ]);

    const output = rewriteAssetReferences(html, urls, "demo/index.html");

    expect(output).toContain('src="https://cdn.example/app.js"');
    expect(output).toContain('src="https://cdn.example/logo.png"');
  });

  it("leaves external, inline, fragment, and root-relative references untouched", () => {
    const html = `
      <a href="https://example.com">https</a>
      <a href="mailto:test@example.com">mail</a>
      <a href="#section">fragment</a>
      <img src="/root.png">
      <img src="data:image/png;base64,AAAA">
      <img srcset="data:image/png;base64,AAAA 1x">
    `;

    const output = rewriteAssetReferences(html, new Map(), "index.html");

    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('href="mailto:test@example.com"');
    expect(output).toContain('href="#section"');
    expect(output).toContain('src="/root.png"');
    expect(output).toContain('src="data:image/png;base64,AAAA"');
    expect(output).toContain('srcset="data:image/png;base64,AAAA 1x"');
  });
});
