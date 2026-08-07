import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext";

export function ResetPasswordPage() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await auth.updatePassword(password);
      setUpdated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password update failed");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-3xl font-semibold">Choose a new password</h1>
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        {updated && <p role="status" className="mt-4 text-sm text-emerald-300">Password updated. You can continue to your sites.</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            New password
            <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950">Update password</button>
        </form>
        <Link to="/sites" className="mt-6 block text-sm text-slate-400 hover:text-white">Go to My Sites</Link>
      </section>
    </main>
  );
}
