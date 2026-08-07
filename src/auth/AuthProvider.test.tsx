import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import {
  AuthProvider,
  type AuthClientLike,
} from "./AuthProvider";
import { useAuth } from "./authContext";

const user: User = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "colby@example.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-08-07T00:00:00.000Z",
};

const session: Session = {
  access_token: "access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 1_800_000_000,
  refresh_token: "refresh-token",
  user,
};

type AuthFixture = {
  client: AuthClientLike;
  emit(session: Session | null): void;
  unsubscribe: ReturnType<typeof vi.fn>;
  calls: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signInWithOAuth: ReturnType<typeof vi.fn>;
    resetPasswordForEmail: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
};

function createAuthFixture(initialSession: Session | null = null): AuthFixture {
  let listener: ((event: string, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const success = async () => ({ data: {}, error: null });
  const calls = {
    signInWithPassword: vi.fn(success),
    signUp: vi.fn(success),
    signInWithOAuth: vi.fn(success),
    resetPasswordForEmail: vi.fn(success),
    updateUser: vi.fn(success),
    signOut: vi.fn(success),
  };

  const client: AuthClientLike = {
    getSession: vi.fn(async () => ({ data: { session: initialSession }, error: null })),
    onAuthStateChange: vi.fn((callback) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    ...calls,
  };

  return {
    client,
    unsubscribe,
    calls,
    emit(nextSession) {
      listener?.("SIGNED_IN", nextSession);
    },
  };
}

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <p>{auth.loading ? "loading" : auth.user?.email ?? "anonymous"}</p>
      <button onClick={() => void auth.signIn("in@example.com", "password")}>sign in</button>
      <button onClick={() => void auth.signUp("up@example.com", "password")}>sign up</button>
      <button onClick={() => void auth.signInWithGoogle()}>google</button>
      <button onClick={() => void auth.requestPasswordReset("reset@example.com")}>reset</button>
      <button onClick={() => void auth.updatePassword("new-password")}>update password</button>
      <button onClick={() => void auth.signOut()}>sign out</button>
    </div>
  );
}

function renderProvider(client: AuthClientLike, children: ReactNode = <Consumer />) {
  return render(<AuthProvider authClient={client}>{children}</AuthProvider>);
}

describe("AuthProvider", () => {
  it("restores the current session and follows auth-state changes", async () => {
    const fixture = createAuthFixture(session);
    const rendered = renderProvider(fixture.client);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("colby@example.com")).toBeInTheDocument();

    act(() => fixture.emit(null));
    expect(screen.getByText("anonymous")).toBeInTheDocument();

    rendered.unmount();
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
  });

  it("delegates account actions with the intended redirect destinations", async () => {
    const fixture = createAuthFixture();
    renderProvider(fixture.client);
    await screen.findByText("anonymous");

    fireEvent.click(screen.getByRole("button", { name: "sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "sign up" }));
    fireEvent.click(screen.getByRole("button", { name: "google" }));
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    fireEvent.click(screen.getByRole("button", { name: "update password" }));
    fireEvent.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() => {
      expect(fixture.calls.signInWithPassword).toHaveBeenCalledWith({
        email: "in@example.com",
        password: "password",
      });
      expect(fixture.calls.signUp).toHaveBeenCalledWith({
        email: "up@example.com",
        password: "password",
      });
      expect(fixture.calls.updateUser).toHaveBeenCalledWith({ password: "new-password" });
      expect(fixture.calls.signOut).toHaveBeenCalledWith();
    });

    const googleOptions = fixture.calls.signInWithOAuth.mock.calls[0][0];
    expect(googleOptions.provider).toBe("google");
    expect(googleOptions.options.redirectTo).toMatch(/\/sites$/);

    const resetOptions = fixture.calls.resetPasswordForEmail.mock.calls[0];
    expect(resetOptions[0]).toBe("reset@example.com");
    expect(resetOptions[1].redirectTo).toMatch(/\/reset-password$/);
  });

  it("surfaces an authentication failure to its caller", async () => {
    const fixture = createAuthFixture();
    fixture.calls.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new Error("Invalid login credentials"),
    });

    function FailureConsumer() {
      const auth = useAuth();
      return (
        <button
          onClick={() => {
            void auth.signIn("bad@example.com", "wrong").catch((error: Error) => {
              document.body.dataset.authError = error.message;
            });
          }}
        >
          try login
        </button>
      );
    }

    const rendered = renderProvider(fixture.client, <FailureConsumer />);
    fireEvent.click(screen.getByRole("button", { name: "try login" }));

    await waitFor(() => expect(document.body.dataset.authError).toBe("Invalid login credentials"));
    delete document.body.dataset.authError;
    rendered.unmount();
  });
});
