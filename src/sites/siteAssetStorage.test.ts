import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createSiteAssetStorage } from "./siteAssetStorage";

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
      storageKey: `drophost-storage-test-${nextTestClientId}`,
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

describe("createSiteAssetStorage", () => {
  it("uploads to the site-assets bucket without overwriting an existing object", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return jsonResponse({
        Id: "object-1",
        Key: "site-assets/user-1/site-1/style.css",
      });
    });

    await createSiteAssetStorage(client).upload(
      "user-1/site-1/style.css",
      new File(["body {}"], "style.css", { type: "text/css" }),
      "text/css",
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(new URL(requests[0].url).pathname).toBe(
      "/storage/v1/object/site-assets/user-1/site-1/style.css",
    );
    expect(requests[0].headers.get("x-upsert")).toBe("false");
  });

  it("surfaces an upload failure to the publishing workflow", async () => {
    const client = createTestClient(async () =>
      jsonResponse(
        {
          statusCode: "409",
          error: "Duplicate",
          message: "The resource already exists",
        },
        409,
      ),
    );

    await expect(
      createSiteAssetStorage(client).upload(
        "user-1/site-1/style.css",
        new File(["body {}"], "style.css", { type: "text/css" }),
        "text/css",
      ),
    ).rejects.toThrow(
      "Unable to upload site asset: The resource already exists",
    );
  });

  it("returns the public URL for an uploaded site asset", () => {
    const client = createTestClient(async () => jsonResponse({}));

    expect(
      createSiteAssetStorage(client).publicUrl(
        "user-1/site-1/assets/logo mark.svg",
      ),
    ).toBe(
      "https://test-project.supabase.co/storage/v1/object/public/site-assets/user-1/site-1/assets/logo%20mark.svg",
    );
  });

  it("removes the requested objects from the site-assets bucket", async () => {
    const requests: Request[] = [];
    const client = createTestClient(async (request) => {
      requests.push(request.clone());
      return jsonResponse([]);
    });

    await createSiteAssetStorage(client).remove([
      "user-1/site-1/style.css",
      "user-1/site-1/app.js",
    ]);

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("DELETE");
    expect(new URL(requests[0].url).pathname).toBe(
      "/storage/v1/object/site-assets",
    );
    await expect(requests[0].clone().json()).resolves.toEqual({
      prefixes: [
        "user-1/site-1/style.css",
        "user-1/site-1/app.js",
      ],
    });
  });

  it("surfaces a storage cleanup failure", async () => {
    const client = createTestClient(async () =>
      jsonResponse(
        {
          statusCode: "500",
          error: "Internal Server Error",
          message: "storage unavailable",
        },
        500,
      ),
    );

    await expect(
      createSiteAssetStorage(client).remove(["user-1/site-1/style.css"]),
    ).rejects.toThrow("Unable to remove site assets: storage unavailable");
  });
});
