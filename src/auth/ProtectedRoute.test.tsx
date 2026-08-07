import { render, screen } from "@testing-library/react";
import type { Session, User } from "@supabase/supabase-js";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, type AuthClientLike } from "./AuthProvider";
import { ProtectedRoute } from "./ProtectedRoute";

const user: User = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "user@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-08-07T00:00:00.000Z",
};

const session: Session = {
  access_token: "access",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "refresh",
  user,
};

function authClient(getSession: AuthClientLike["getSession"]): AuthClientLike {
  const action = vi.fn(async () => ({ data: {}, error: null }));
  return {
    getSession,
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: action,
    signUp: action,
    signInWithOAuth: action,
    resetPasswordForEmail: action,
    updateUser: action,
    signOut: action,
  };
}

function renderProtected(client: AuthClientLike) {
  return render(
    <AuthProvider authClient={client}>
      <MemoryRouter
        initialEntries={["/sites"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/sites" element={<p>My sites</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a session-loading state while auth is unresolved", () => {
    const pending = new Promise<never>(() => {});
    renderProtected(authClient(() => pending));
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  });

  it("redirects an anonymous visitor to login", async () => {
    renderProtected(authClient(async () => ({ data: { session: null }, error: null })));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected outlet for an authenticated user", async () => {
    renderProtected(authClient(async () => ({ data: { session }, error: null })));
    expect(await screen.findByText("My sites")).toBeInTheDocument();
  });
});
