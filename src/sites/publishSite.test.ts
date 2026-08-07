import { describe, expect, it } from "vitest";

import type { PreparedSite } from "../lib/archive";
import type { SiteRepository } from "./siteRepository";
import {
  publishPreparedSite,
  type SiteAssetStorage,
} from "./publishSite";
import type { Site, SiteFile } from "./types";

describe("publishPreparedSite", () => {
  it("uploads assets, rewrites the HTML, and records metadata in order", async () => {
    const events: string[] = [];
    let publishedHtml = "";
    let recordedFiles: Omit<SiteFile, "id">[] = [];
    const createdSite: Site = {
      id: "site-1",
      userId: "user-1",
      name: "Demo Site",
      slug: "demo-site",
      entryHtml: "",
      createdAt: "2026-08-05T12:00:00.000Z",
      updatedAt: "2026-08-05T12:00:00.000Z",
    };
    const repository: SiteRepository = {
      list: async () => [],
      create: async (input) => {
        if (input.slug !== "demo-site" || input.userId !== "user-1") {
          throw new Error("unexpected site reservation input");
        }
        events.push("create");
        return createdSite;
      },
      updateEntryHtml: async (_siteId, html) => {
        events.push("update-html");
        publishedHtml = html;
      },
      addFiles: async (_siteId, files) => {
        events.push("add-files");
        recordedFiles = files;
      },
      rename: async () => undefined,
      delete: async () => undefined,
    };
    const storage: SiteAssetStorage = {
      upload: async (path) => {
        events.push(`upload:${path}`);
      },
      publicUrl: (path) => {
        events.push(`public-url:${path}`);
        return `https://cdn.test/${path}`;
      },
      remove: async () => undefined,
    };
    const prepared: PreparedSite = {
      entryPath: "site/index.html",
      entryHtml:
        '<!doctype html><link href="style.css"><img src="assets/logo.svg">',
      assets: [
        {
          relativePath: "site/style.css",
          mimeType: "text/css",
          file: new File(["body{}"], "style.css", { type: "text/css" }),
        },
        {
          relativePath: "site/assets/logo.svg",
          mimeType: "image/svg+xml",
          file: new File(["<svg/>"] , "logo.svg", { type: "image/svg+xml" }),
        },
      ],
    };

    const published = await publishPreparedSite({
      userId: "user-1",
      name: "Demo Site",
      prepared,
      repository,
      storage,
    });

    expect(events).toEqual([
      "create",
      "upload:user-1/site-1/site/style.css",
      "upload:user-1/site-1/site/assets/logo.svg",
      "public-url:user-1/site-1/site/style.css",
      "public-url:user-1/site-1/site/assets/logo.svg",
      "update-html",
      "add-files",
    ]);
    expect(publishedHtml).toContain(
      'href="https://cdn.test/user-1/site-1/site/style.css"',
    );
    expect(publishedHtml).toContain(
      'src="https://cdn.test/user-1/site-1/site/assets/logo.svg"',
    );
    expect(recordedFiles).toEqual([
      {
        siteId: "site-1",
        relativePath: "site/style.css",
        storagePath: "user-1/site-1/site/style.css",
        mimeType: "text/css",
      },
      {
        siteId: "site-1",
        relativePath: "site/assets/logo.svg",
        storagePath: "user-1/site-1/site/assets/logo.svg",
        mimeType: "image/svg+xml",
      },
    ]);
    expect(published.entryHtml).toBe(publishedHtml);
  });

  it("cleans up uploaded assets and the draft row when publication fails", async () => {
    const events: string[] = [];
    const createdSite: Site = {
      id: "site-cleanup",
      userId: "user-1",
      name: "Cleanup Demo",
      slug: "cleanup-demo",
      entryHtml: "<img src=\"one.png\"><img src=\"two.png\">",
      createdAt: "2026-08-05T12:00:00.000Z",
      updatedAt: "2026-08-05T12:00:00.000Z",
    };
    const repository: SiteRepository = {
      list: async () => [],
      create: async () => {
        events.push("create");
        return createdSite;
      },
      updateEntryHtml: async () => undefined,
      addFiles: async () => undefined,
      rename: async () => undefined,
      delete: async (siteId) => {
        events.push(`delete-site:${siteId}`);
      },
    };
    let uploadNumber = 0;
    const storage: SiteAssetStorage = {
      upload: async (path) => {
        uploadNumber += 1;
        events.push(`upload:${path}`);
        if (uploadNumber === 2) throw new Error("second upload failed");
      },
      publicUrl: (path) => `https://cdn.test/${path}`,
      remove: async (paths) => {
        events.push(`remove:${paths.join(",")}`);
      },
    };
    const prepared: PreparedSite = {
      entryPath: "index.html",
      entryHtml: createdSite.entryHtml,
      assets: [
        {
          relativePath: "one.png",
          mimeType: "image/png",
          file: new File(["one"], "one.png", { type: "image/png" }),
        },
        {
          relativePath: "two.png",
          mimeType: "image/png",
          file: new File(["two"], "two.png", { type: "image/png" }),
        },
      ],
    };

    await expect(
      publishPreparedSite({
        userId: "user-1",
        name: "Cleanup Demo",
        prepared,
        repository,
        storage,
      }),
    ).rejects.toThrow("second upload failed");
    expect(events).toEqual([
      "create",
      "upload:user-1/site-cleanup/one.png",
      "upload:user-1/site-cleanup/two.png",
      "remove:user-1/site-cleanup/one.png",
      "delete-site:site-cleanup",
    ]);
  });

  it("attempts draft cleanup even when asset cleanup also fails", async () => {
    const events: string[] = [];
    const createdSite: Site = {
      id: "site-cleanup-failure",
      userId: "user-1",
      name: "Cleanup Failure",
      slug: "cleanup-failure",
      entryHtml: '<img src="one.png">',
      createdAt: "2026-08-05T12:00:00.000Z",
      updatedAt: "2026-08-05T12:00:00.000Z",
    };
    const repository: SiteRepository = {
      list: async () => [],
      create: async () => createdSite,
      updateEntryHtml: async () => {
        throw new Error("database update failed");
      },
      addFiles: async () => undefined,
      rename: async () => undefined,
      delete: async (siteId) => {
        events.push(`delete-site:${siteId}`);
      },
    };
    const storage: SiteAssetStorage = {
      upload: async (path) => {
        events.push(`upload:${path}`);
      },
      publicUrl: (path) => `https://cdn.test/${path}`,
      remove: async (paths) => {
        events.push(`remove:${paths.join(",")}`);
        throw new Error("asset cleanup failed");
      },
    };
    const prepared: PreparedSite = {
      entryPath: "index.html",
      entryHtml: createdSite.entryHtml,
      assets: [
        {
          relativePath: "one.png",
          mimeType: "image/png",
          file: new File(["one"], "one.png", { type: "image/png" }),
        },
      ],
    };

    await expect(
      publishPreparedSite({
        userId: "user-1",
        name: "Cleanup Failure",
        prepared,
        repository,
        storage,
      }),
    ).rejects.toThrow("database update failed");
    expect(events).toContain("remove:user-1/site-cleanup-failure/one.png");
    expect(events).toContain("delete-site:site-cleanup-failure");
  });

  it("publishes a standalone HTML file without inserting empty asset metadata", async () => {
    const events: string[] = [];
    const createdSite: Site = {
      id: "site-html-only",
      userId: "user-1",
      name: "HTML Only",
      slug: "html-only",
      entryHtml: "<h1>Standalone</h1>",
      createdAt: "2026-08-05T12:00:00.000Z",
      updatedAt: "2026-08-05T12:00:00.000Z",
    };
    const repository: SiteRepository = {
      list: async () => [],
      create: async () => {
        events.push("create");
        return createdSite;
      },
      updateEntryHtml: async () => {
        events.push("update-html");
      },
      addFiles: async () => {
        throw new Error("empty metadata insert should not run");
      },
      rename: async () => undefined,
      delete: async () => undefined,
    };
    const storage: SiteAssetStorage = {
      upload: async () => {
        throw new Error("standalone HTML has no upload assets");
      },
      publicUrl: () => {
        throw new Error("standalone HTML has no public asset URLs");
      },
      remove: async () => undefined,
    };

    const published = await publishPreparedSite({
      userId: "user-1",
      name: "HTML Only",
      prepared: {
        entryPath: "index.html",
        entryHtml: "<h1>Standalone</h1>",
        assets: [],
      },
      repository,
      storage,
    });

    expect(events).toEqual(["create", "update-html"]);
    expect(published.entryHtml).toContain("<h1>Standalone</h1>");
  });
});
