import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { AuthContext, type AuthContextValue } from "./auth/authContext";
import type { SiteAssetStorage } from "./sites/publishSite";
import type { SiteRepository } from "./sites/siteRepository";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const repository: SiteRepository = {
  list: async () => [],
  create: async () => {
    throw new Error("Not expected in this test");
  },
  updateEntryHtml: async () => undefined,
  addFiles: async () => undefined,
  rename: async () => undefined,
  delete: async () => undefined,
};

const storage: SiteAssetStorage = {
  upload: async () => undefined,
  publicUrl: (path) => `https://assets.example/${path}`,
  remove: async () => undefined,
};

const anonymousAuth: AuthContextValue = {
  user: null,
  loading: false,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signInWithGoogle: async () => undefined,
  requestPasswordReset: async () => undefined,
  updatePassword: async () => undefined,
  signOut: async () => undefined,
};

const authenticatedAuth: AuthContextValue = {
  ...anonymousAuth,
  user: { id: "user-1" } as AuthContextValue["user"],
};

function renderApp(path: string, auth = anonymousAuth) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthContext.Provider value={auth}>
        <App repository={repository} storage={storage} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("App routes", () => {
  it("serves the sign-in page without an authenticated session", () => {
    renderApp("/login");

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("serves account registration without an authenticated session", () => {
    renderApp("/register");

    expect(
      screen.getByRole("heading", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("serves password-reset requests without an authenticated session", () => {
    renderApp("/forgot-password");

    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();
  });

  it("serves the reset-link password form", () => {
    renderApp("/reset-password");

    expect(
      screen.getByRole("heading", { name: "Choose a new password" }),
    ).toBeInTheDocument();
  });

  it("redirects an anonymous visitor away from the site dashboard", async () => {
    renderApp("/sites");

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("sends an authenticated root visit to the site dashboard", async () => {
    renderApp("/", authenticatedAuth);

    expect(
      await screen.findByRole("heading", { name: "My sites" }),
    ).toBeInTheDocument();
  });

  it("serves the upload workflow only inside the authenticated app", () => {
    renderApp("/upload", authenticatedAuth);

    expect(
      screen.getByRole("heading", { name: "Publish a site" }),
    ).toBeInTheDocument();
  });

  it("keeps the hosted-site viewer public for anonymous visitors", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test-project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
    vi.stubGlobal("fetch", async () =>
      Response.json({
        name: "Public Demo",
        slug: "public-demo",
        entryHtml: "<h1>Public Demo</h1>",
      }),
    );

    renderApp("/view/public-demo");

    expect(await screen.findByTitle("Public Demo")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });
});
