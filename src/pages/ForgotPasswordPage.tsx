import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await auth.requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset request failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-400">We will send a secure reset link to your account email.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        {sent && <p role="status" className="mt-4 text-sm text-emerald-300">Check your email for the reset link.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950">Send reset link</button>
        </form>
        <Link to="/login" className="mt-6 block text-sm text-slate-400 hover:text-white">Back to sign in</Link>
      </section>
    </main>
  );
}
