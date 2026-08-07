import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSiteRepository } from "./siteRepository";

type FetchHandler = (request: Request) => Promise<Response>;
let nextTestClientId = 0;

function createTestClient(handler: FetchHandler) {
  nextTestClientId += 1;
  const testFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => handler(new Request(input, init));

  return createClient("https://test-project.supabase.co", "test-publishable-key", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
      storageKey: `drophost-repository-test-${nextTestClientId}`,
    },
    global: { fetch: testFetch },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createSiteRepository", () => {
  it("lists RLS-filtered site rows and maps database field names", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return jsonResponse([
        {
          id: "site-1",
          user_id: "user-1",
          name: "Portfolio",
          slug: "portfolio",
          entry_html: "<h1>Portfolio</h1>",
          created_at: "2026-08-01T12:00:00.000Z",
          updated_at: "2026-08-02T12:00:00.000Z",
        },
      ]);
    });

    const sites = await createSiteRepository(client).list();

    expect(sites).toEqual([
      {
        id: "site-1",
        userId: "user-1",
        name: "Portfolio",
        slug: "portfolio",
        entryHtml: "<h1>Portfolio</h1>",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-02T12:00:00.000Z",
      },
    ]);
    expect(requests).toHaveLength(1);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/rest/v1/sites");
    expect(url.searchParams.get("user_id")).toBeNull();
  });

  it("creates a site with the authenticated owner fields and maps the result", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return jsonResponse(
        {
          id: "site-2",
          user_id: "user-2",
          name: "Demo Site",
          slug: "demo-site",
          entry_html: "<h1>Demo</h1>",
          created_at: "2026-08-03T12:00:00.000Z",
          updated_at: "2026-08-03T12:00:00.000Z",
        },
        201,
      );
    });

    const site = await createSiteRepository(client).create({
      userId: "user-2",
      name: "Demo Site",
      slug: "demo-site",
      entryHtml: "<h1>Demo</h1>",
    });

    expect(site).toEqual({
      id: "site-2",
      userId: "user-2",
      name: "Demo Site",
      slug: "demo-site",
      entryHtml: "<h1>Demo</h1>",
      createdAt: "2026-08-03T12:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    await expect(requests[0].clone().json()).resolves.toEqual({
      user_id: "user-2",
      name: "Demo Site",
      slug: "demo-site",
      entry_html: "<h1>Demo</h1>",
    });
  });

  it("renames only the selected site name", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return new Response(null, { status: 204 });
    });

    await createSiteRepository(client).rename("site-1", "New Name");

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("PATCH");
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/rest/v1/sites");
    expect(url.searchParams.get("id")).toBe("eq.site-1");
    await expect(requests[0].clone().json()).resolves.toEqual({
      name: "New Name",
    });
  });

  it("updates only the selected site's entry HTML", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return new Response(null, { status: 204 });
    });

    await createSiteRepository(client).updateEntryHtml(
      "site-1",
      "<!doctype html><h1>Published</h1>",
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("PATCH");
    expect(new URL(requests[0].url).searchParams.get("id")).toBe("eq.site-1");
    await expect(requests[0].clone().json()).resolves.toEqual({
      entry_html: "<!doctype html><h1>Published</h1>",
    });
  });

  it("records uploaded asset metadata for the selected site", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return new Response(null, { status: 201 });
    });

    await createSiteRepository(client).addFiles("site-1", [
      {
        siteId: "site-1",
        relativePath: "assets/logo.svg",
        storagePath: "user-1/site-1/assets/logo.svg",
        mimeType: "image/svg+xml",
      },
      {
        siteId: "site-1",
        relativePath: "assets/app.js",
        storagePath: "user-1/site-1/assets/app.js",
        mimeType: "text/javascript",
      },
    ]);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(new URL(requests[0].url).pathname).toBe("/rest/v1/site_files");
    await expect(requests[0].clone().json()).resolves.toEqual([
      {
        site_id: "site-1",
        relative_path: "assets/logo.svg",
        storage_path: "user-1/site-1/assets/logo.svg",
        mime_type: "image/svg+xml",
      },
      {
        site_id: "site-1",
        relative_path: "assets/app.js",
        storage_path: "user-1/site-1/assets/app.js",
        mime_type: "text/javascript",
      },
    ]);
  });

  it("removes stored assets before deleting the selected site row", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/rest/v1/site_files") {
        return jsonResponse([
          { storage_path: "user-1/site-1/assets/logo.svg" },
          { storage_path: "user-1/site-1/assets/app.js" },
        ]);
      }

      if (
        request.method === "DELETE" &&
        url.pathname === "/storage/v1/object/site-assets"
      ) {
        return jsonResponse([]);
      }

      if (request.method === "DELETE" && url.pathname === "/rest/v1/sites") {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({ message: "Unexpected request" }, 500);
    });

    await createSiteRepository(client).delete("site-1");

    expect(requests.map((request) => request.method)).toEqual([
      "GET",
      "DELETE",
      "DELETE",
    ]);
    expect(new URL(requests[0].url).searchParams.get("site_id")).toBe(
      "eq.site-1",
    );
    await expect(requests[1].clone().json()).resolves.toEqual({
      prefixes: [
        "user-1/site-1/assets/logo.svg",
        "user-1/site-1/assets/app.js",
      ],
    });
    expect(new URL(requests[2].url).searchParams.get("id")).toBe("eq.site-1");
  });

  it("does not delete the site row when Storage deletion fails", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/rest/v1/site_files") {
        return jsonResponse([{ storage_path: "user-1/site-1/assets/logo.svg" }]);
      }

      if (url.pathname === "/storage/v1/object/site-assets") {
        return jsonResponse(
          {
            statusCode: "500",
            error: "Internal Server Error",
            message: "storage unavailable",
          },
          500,
        );
      }

      if (request.method === "DELETE" && url.pathname === "/rest/v1/sites") {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({ message: "Unexpected request" }, 500);
    });

    await expect(createSiteRepository(client).delete("site-1")).rejects.toThrow(
      "Unable to delete site files: storage unavailable",
    );
    expect(
      requests.some(
        (request) =>
          request.method === "DELETE" &&
          new URL(request.url).pathname === "/rest/v1/sites",
      ),
    ).toBe(false);
  });

  it("advances the slug candidate after unique-constraint collisions", async () => {
    const attemptedSlugs: string[] = [];
    const client = createTestClient(async (request) => {
      const body = (await request.clone().json()) as { slug: string };
      attemptedSlugs.push(body.slug);

      if (attemptedSlugs.length < 3) {
        return jsonResponse(
          {
            code: "23505",
            details: null,
            hint: null,
            message: "duplicate key value violates unique constraint sites_slug_key",
          },
          409,
        );
      }

      return jsonResponse(
        {
          id: "site-3",
          user_id: "user-3",
          name: "Demo",
          slug: body.slug,
          entry_html: "<h1>Demo</h1>",
          created_at: "2026-08-04T12:00:00.000Z",
          updated_at: "2026-08-04T12:00:00.000Z",
        },
        201,
      );
    });

    const site = await createSiteRepository(client).create({
      userId: "user-3",
      name: "Demo",
      slug: "demo",
      entryHtml: "<h1>Demo</h1>",
    });

    expect(attemptedSlugs).toEqual(["demo", "demo-2", "demo-3"]);
    expect(site.slug).toBe("demo-3");
  });

  it("does not retry site creation for a non-unique database error", async () => {
    let attempts = 0;
    const client = createTestClient(async () => {
      attempts += 1;
      if (attempts === 1) {
        return jsonResponse(
          {
            code: "23514",
            details: null,
            hint: null,
            message: "name violates sites_name_check",
          },
          400,
        );
      }

      return jsonResponse(
        {
          id: "should-not-exist",
          user_id: "user-3",
          name: "Demo",
          slug: "demo-2",
          entry_html: "<h1>Demo</h1>",
          created_at: "2026-08-04T12:00:00.000Z",
          updated_at: "2026-08-04T12:00:00.000Z",
        },
        201,
      );
    });

    await expect(
      createSiteRepository(client).create({
        userId: "user-3",
        name: "Demo",
        slug: "demo",
        entryHtml: "<h1>Demo</h1>",
      }),
    ).rejects.toThrow("name violates sites_name_check");
    expect(attempts).toBe(1);
  });

  it("stops retrying when unique slug collisions never clear", async () => {
    let attempts = 0;
    const client = createTestClient(async () => {
      attempts += 1;
      if (attempts > 50) {
        throw new Error("unbounded slug collision retry");
      }

      return jsonResponse(
        {
          code: "23505",
          details: null,
          hint: null,
          message: "duplicate key value violates unique constraint sites_slug_key",
        },
        409,
      );
    });

    await expect(
      createSiteRepository(client).create({
        userId: "user-3",
        name: "Demo",
        slug: "demo",
        entryHtml: "<h1>Demo</h1>",
      }),
    ).rejects.toThrow("Unable to reserve an available site URL");
    expect(attempts).toBeLessThanOrEqual(50);
  });
});
