import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, type AuthClientLike } from "../auth/AuthProvider";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

function createClient() {
  const success = async (): Promise<{ data: unknown; error: Error | null }> => ({
    data: {},
    error: null,
  });
  const calls = {
    signInWithPassword: vi.fn(success),
    signUp: vi.fn(success),
    signInWithOAuth: vi.fn(success),
    resetPasswordForEmail: vi.fn(success),
    updateUser: vi.fn(success),
    signOut: vi.fn(success),
  };
  const client: AuthClientLike = {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...calls,
  };
  return { client, calls };
}

function renderPage(page: React.ReactNode, client: AuthClientLike) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider authClient={client}>{page}</AuthProvider>
    </MemoryRouter>,
  );
}

describe("authentication pages", () => {
  it("submits email login without offering unconfigured OAuth", async () => {
    const { client, calls } = createClient();
    const user = userEvent.setup();
    renderPage(<LoginPage />, client);

    await user.type(screen.getByLabelText("Email"), "colby@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(calls.signInWithPassword).toHaveBeenCalledWith({
        email: "colby@example.com",
        password: "secret123",
      });
    });
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });

  it("shows login failures instead of swallowing them", async () => {
    const { client, calls } = createClient();
    calls.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new Error("Invalid login credentials"),
    });
    const user = userEvent.setup();
    renderPage(<LoginPage />, client);

    await user.type(screen.getByLabelText("Email"), "bad@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
  });

  it("registers an account and explains email verification", async () => {
    const { client, calls } = createClient();
    const user = userEvent.setup();
    renderPage(<RegisterPage />, client);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "strongpass");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(calls.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "strongpass",
    }));
    expect(screen.getByText(/verification email may be required/i)).toBeInTheDocument();
  });

  it("requests a password reset and confirms the request", async () => {
    const { client, calls } = createClient();
    const user = userEvent.setup();
    renderPage(<ForgotPasswordPage />, client);

    await user.type(screen.getByLabelText("Email"), "reset@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(calls.resetPasswordForEmail).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("Check your email");
  });

  it("updates the authenticated user's password", async () => {
    const { client, calls } = createClient();
    const user = userEvent.setup();
    renderPage(<ResetPasswordPage />, client);

    await user.type(screen.getByLabelText("New password"), "updatedpass");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => expect(calls.updateUser).toHaveBeenCalledWith({ password: "updatedpass" }));
    expect(screen.getByRole("status")).toHaveTextContent("Password updated");
  });
});
