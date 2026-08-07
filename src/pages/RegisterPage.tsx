import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";

export function RegisterPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await auth.signUp(email, password);
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account creation failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">DropHost</p>
        <h1 className="mt-3 text-3xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">A verification email may be required before you can sign in.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
        {submitted && <p role="status" className="mt-4 rounded-lg bg-emerald-950/60 p-3 text-sm text-emerald-200">Account created. Check your email if verification is enabled.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950">Create account</button>
        </form>
        <Link to="/login" className="mt-6 block text-sm text-slate-400 hover:text-white">Already have an account? Sign in</Link>
      </section>
    </main>
  );
}
