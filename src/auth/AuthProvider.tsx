import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type AuthContextValue } from "./authContext";

type AuthActionResult = Promise<{ data: unknown; error: Error | null }>;

export type AuthClientLike = {
  getSession(): Promise<{ data: { session: Session | null }; error: Error | null }>;
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
  signInWithPassword(input: { email: string; password: string }): AuthActionResult;
  signUp(input: { email: string; password: string }): AuthActionResult;
  signInWithOAuth(input: {
    provider: "google";
    options: { redirectTo: string };
  }): AuthActionResult;
  resetPasswordForEmail(email: string, options: { redirectTo: string }): AuthActionResult;
  updateUser(input: { password: string }): AuthActionResult;
  signOut(): AuthActionResult;
};

async function throwOnAuthError(result: { error: Error | null }): Promise<void> {
  if (result.error) throw result.error;
}

export function AuthProvider({
  children,
  authClient,
}: {
  children: ReactNode;
  authClient: AuthClientLike;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    const { data: { subscription } } = authClient.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventSeen = true;
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    void authClient.getSession().then(({ data, error }) => {
      if (!active || authEventSeen) return;
      setUser(error ? null : data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authClient]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(email, password) {
      await throwOnAuthError(await authClient.signInWithPassword({ email, password }));
    },
    async signUp(email, password) {
      await throwOnAuthError(await authClient.signUp({ email, password }));
    },
    async signInWithGoogle() {
      await throwOnAuthError(await authClient.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/sites` },
      }));
    },
    async requestPasswordReset(email) {
      await throwOnAuthError(await authClient.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
    },
    async updatePassword(password) {
      await throwOnAuthError(await authClient.updateUser({ password }));
    },
    async signOut() {
      await throwOnAuthError(await authClient.signOut());
    },
  }), [authClient, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
