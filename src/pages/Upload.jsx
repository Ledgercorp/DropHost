import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  UploadCloud,
  FileArchive,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Link2,
} from "lucide-react";

const ADJECTIVES = ["swift", "calm", "bright", "lunar", "amber", "violet", "nova", "ember"];
const NOUNS = ["falcon", "harbor", "meadow", "pixel", "summit", "willow", "compass", "lantern"];

function makeSlug() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}-${n}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function isExternalUrl(val) {
  return /^(https?:)?\/\//i.test(val) || /^(data:|mailto:|tel:|#|javascript:)/i.test(val);
}

function rewriteHtml(html, pathToUrl, baseDir) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const normalize = (val) => {
    if (!val || isExternalUrl(val)) return null;
    let v = val.replace(/^\.\//, "");
    v = v.split(/[?#]/)[0];
    // resolve relative to base dir
    if (baseDir && !v.startsWith("/")) {
      v = baseDir + v;
    }
    return v;
  };

  const apply = (selector, attr) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      const norm = normalize(raw);
      if (norm && pathToUrl[norm]) {
        el.setAttribute(attr, pathToUrl[norm]);
      }
    });
  };

  apply("link[href]", "href");
  apply("script[src]", "src");
  apply("img[src]", "src");
  apply("source[src]", "src");
  apply("video[src]", "src");
  apply("audio[src]", "src");
  apply("iframe[src]", "src");

  // inline style url() references
  doc.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style");
    if (!style || !style.includes("url(")) return;
    const next = style.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, p) => {
      const norm = normalize(p);
      if (norm && pathToUrl[norm]) return `url(${q}${pathToUrl[norm]}${q})`;
      return m;
    });
    el.setAttribute("style", next);
  });

  // strip crossorigin/integrity to avoid module-loading conflicts in iframe
  doc.querySelectorAll("[crossorigin]").forEach((el) => el.removeAttribute("crossorigin"));
  doc.querySelectorAll("[integrity]").forEach((el) => el.removeAttribute("integrity"));

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

function guessMime(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map = {
    html: "text/html", htm: "text/html", js: "text/javascript", mjs: "text/javascript",
    css: "text/css", json: "application/json", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
    ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    otf: "font/otf", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg",
    wav: "audio/wav", ogg: "audio/ogg", pdf: "application/pdf", txt: "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

export default function Upload() {
  const [name, setName] = useState("");
  const [files, setFiles] = useState([]); // { path, blob }
  const [indexHtml, setIndexHtml] = useState("");
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [published, setPublished] = useState(null); // { slug }
  const inputRef = useRef(null);

  const collectFromZip = async (zipFile) => {
    const zip = await JSZip.loadAsync(zipFile);
    const out = [];
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      if (path.includes("__MACOSX") || path.split("/").pop().startsWith(".")) continue;
      const blob = await entry.async("blob");
      out.push({ path, blob });
    }
    return out;
  };

  const collectFromList = async (list) => {
    const out = [];
    for (const file of list) {
      if (file.name.endsWith(".zip") || file.type === "application/zip") {
        out.push(...(await collectFromZip(file)));
      } else {
        out.push({ path: file.webkitRelativePath || file.name, blob: file });
      }
    }
    return out;
  };

  const ingest = async (list) => {
    setPublished(null);
    try {
      const collected = await collectFromList(list);
      if (!collected.length) {
        toast({ title: "No files found", description: "Drop an HTML file or a ZIP archive." });
        return;
      }
      const indexEntry = collected.find((f) => /(?:^|\/)index\.html?$/i.test(f.path));
      if (!indexEntry) {
        toast({ title: "No index.html found", description: "Make sure your archive has an index.html." });
        return;
      }
      const baseDir = indexEntry.path.replace(/index\.html?$/i, "");
      const html = await indexEntry.blob.text();
      setIndexHtml(html);
      setFiles(collected.filter((f) => f !== indexEntry));
      if (!name) {
        const baseName = baseDir ? baseDir.replace(/\/$/, "").split("/").pop() : indexEntry.name?.replace(/\.html?$/i, "") || "My site";
        setName(baseName || "My site");
      }
      toast({ title: "Files ready", description: `${collected.length} file(s) loaded.` });
    } catch (e) {
      toast({ title: "Could not read files", description: e.message });
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const list = Array.from(e.dataTransfer?.files || []);
    if (list.length) ingest(list);
  }, []);

  const onPick = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length) ingest(list);
  };

  const publish = async () => {
    if (!indexHtml) return;
    setPublishing(true);
    setProgress({ current: 0, total: files.length, label: "Uploading files…" });
    const slug = makeSlug();
    const baseDir = files.length
      ? files[0].path.replace(/\/[^/]+$/, "/").match(/^(.*?)[^/]+$/)?.[1] || ""
      : "";
    try {
      // create the site shell first so SiteFiles can reference it
      const site = await base44.entities.Site.create({
        name: name.trim() || "Untitled site",
        slug,
        entryHtml: "",
      });

      const pathToUrl = {};
      let i = 0;
      for (const f of files) {
        i++;
        setProgress({ current: i, total: files.length, label: `Uploading ${f.path}` });
        const fileObj = new File([f.blob], f.path.split("/").pop(), { type: guessMime(f.path) });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileObj });
        const relPath = f.path;
        pathToUrl[relPath] = file_url;
        await base44.entities.SiteFile.create({
          siteId: site.id,
          path: relPath,
          fileUrl: file_url,
          mimeType: guessMime(f.path),
        });
      }

      setProgress({ current: files.length, total: files.length, label: "Finalizing…" });
      const rewritten = rewriteHtml(indexHtml, pathToUrl, "");
      await base44.entities.Site.update(site.id, { entryHtml: rewritten });

      setPublished({ slug });
      toast({ title: "Published!", description: `Your site is live at /view/${slug}` });
    } catch (e) {
      toast({ title: "Publishing failed", description: e.message });
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setIndexHtml("");
    setName("");
    setPublished(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sites
          </button>
          <span className="font-semibold text-foreground">Publish a site</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {published ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">Your site is live</h2>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Share this link with anyone.
            </p>
            <div className="flex items-center gap-2 max-w-md mx-auto mb-6">
              <Input readOnly value={`${window.location.origin}/view/${published.slug}`} />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/view/${published.slug}`);
                  toast({ title: "Link copied" });
                }}
              >
                <Link2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => window.open(`/view/${published.slug}`, "_blank")}>
                View site
              </Button>
              <Button variant="outline" onClick={reset}>
                Publish another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onPick}
              />
              {indexHtml ? (
                <div className="flex flex-col items-center">
                  <FileArchive className="w-10 h-10 text-primary mb-3" />
                  <p className="text-foreground font-medium">
                    {files.length + 1} file(s) ready to publish
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">Click to choose different files</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-foreground font-medium">
                    Drop your files here, or click to browse
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    A single HTML file, multiple files, or a .zip archive
                  </p>
                </div>
              )}
            </div>

            {indexHtml && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site name</Label>
                  <Input
                    id="site-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My awesome site"
                  />
                </div>
                <Button
                  className="w-full h-11"
                  onClick={publish}
                  disabled={publishing || !indexHtml}
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {progress.total > 0
                        ? `Uploading ${progress.current}/${progress.total}…`
                        : progress.label || "Publishing…"}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Publish site
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}