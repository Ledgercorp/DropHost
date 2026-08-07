import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicSitePage } from "./PublicSitePage";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function renderPublicSite(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/view/:slug" element={<PublicSitePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicSitePage", () => {
  it("loads the route slug and renders hosted HTML in a restricted iframe", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    const requests: Request[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Response.json({
        name: "Portfolio",
        slug: "demo-site",
        entryHtml: "<!doctype html><h1>Real hosted page</h1>",
      });
    });

    renderPublicSite("/view/demo-site");

    const frame = await screen.findByTitle("Portfolio");
    expect(requests).toHaveLength(1);
    const requestUrl = new URL(requests[0].url);
    expect(requestUrl.pathname).toBe("/functions/v1/public-site");
    expect(requestUrl.searchParams.get("slug")).toBe("demo-site");
    expect(frame).toHaveAttribute(
      "srcdoc",
      "<!doctype html><h1>Real hosted page</h1>",
    );
    expect(frame).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-forms allow-modals allow-popups",
    );
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("uses only the browser-safe publishable key for the public function request", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    const requests: Request[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Response.json({
        name: "Portfolio",
        slug: "demo-site",
        entryHtml: "<h1>Portfolio</h1>",
      });
    });

    renderPublicSite("/view/demo-site");
    await screen.findByTitle("Portfolio");

    expect(requests[0].headers.get("apikey")).toBe("test-publishable-key");
    expect(requests[0].headers.get("authorization")).toBeNull();
  });

  it("shows a clear not-found state for an unknown slug", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: "Site not found" }, { status: 404 }),
    );

    renderPublicSite("/view/missing-site");

    expect(
      await screen.findByRole("heading", { name: "Site not found" }),
    ).toBeInTheDocument();
  });

  it("shows a failure state when the public function cannot load the site", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: "Unable to load site" }, { status: 500 }),
    );

    renderPublicSite("/view/demo-site");

    expect(
      await screen.findByRole("heading", { name: "Unable to load site" }),
    ).toBeInTheDocument();
  });

  it("shows the same failure state when the public request cannot connect", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Network unavailable");
    });

    renderPublicSite("/view/demo-site");

    expect(
      await screen.findByRole("heading", { name: "Unable to load site" }),
    ).toBeInTheDocument();
  });
});
