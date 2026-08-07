import { describe, expect, it } from "vitest";

import { createPublicSiteHandler } from "../_shared/public-site-handler";

describe("public-site handler", () => {
  it("answers CORS preflight without running a site lookup", async () => {
    const handler = createPublicSiteHandler(async () => {
      throw new Error("lookup should not run for OPTIONS");
    });

    const response = await handler(
      new Request("https://example.test/functions/v1/public-site", {
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("rejects a GET request without a valid slug", async () => {
    const handler = createPublicSiteHandler(async () => null);

    const response = await handler(
      new Request("https://example.test/functions/v1/public-site"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "Missing or invalid site slug",
    });
  });

  it("rejects a slug outside the public URL format", async () => {
    const handler = createPublicSiteHandler(async (slug) => ({
      name: "Unexpected lookup",
      slug,
      entry_html: "<p>This lookup should not be accepted.</p>",
    }));

    const response = await handler(
      new Request(
        "https://example.test/functions/v1/public-site?slug=../../private",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing or invalid site slug",
    });
  });

  it("returns 404 when the requested slug does not exist", async () => {
    const handler = createPublicSiteHandler(async () => null);

    const response = await handler(
      new Request("https://example.test/functions/v1/public-site?slug=missing-site"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Site not found" });
  });

  it("returns only the public site fields for a known slug", async () => {
    const databaseRow = {
      name: "Published Site",
      slug: "published-site",
      entry_html: "<!doctype html><h1>Hello</h1>",
      user_id: "private-user-id",
      storage_path: "private/path",
    };
    const handler = createPublicSiteHandler(async (slug) =>
      slug === "published-site" ? databaseRow : null,
    );

    const response = await handler(
      new Request(
        "https://example.test/functions/v1/public-site?slug=published-site",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: "Published Site",
      slug: "published-site",
      entryHtml: "<!doctype html><h1>Hello</h1>",
    });
  });

  it("rejects methods other than GET and OPTIONS", async () => {
    const handler = createPublicSiteHandler(async () => null);

    const response = await handler(
      new Request("https://example.test/functions/v1/public-site?slug=anything", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, OPTIONS");
  });

  it("returns a generic server error when the site lookup fails", async () => {
    const handler = createPublicSiteHandler(async () => {
      throw new Error("database detail that must stay private");
    });

    const response = await handler(
      new Request("https://example.test/functions/v1/public-site?slug=published-site"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to load site",
    });
  });
});
