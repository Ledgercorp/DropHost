import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.user) navigate("/sites", { replace: true });
  }, [auth.user, navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.signIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">DropHost</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Manage and publish your static sites.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <button disabled={submitting} className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 flex justify-between text-sm text-slate-400">
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link to="/register" className="hover:text-white">Create account</Link>
        </div>
      </section>
    </main>
  );
}
