import { useAuth } from "../auth/authContext";
import { SiteUploader } from "../components/SiteUploader";
import type { SiteAssetStorage } from "../sites/publishSite";
import type { SiteRepository } from "../sites/siteRepository";

export function UploadPage({
  repository,
  storage,
}: {
  repository: SiteRepository;
  storage: SiteAssetStorage;
}) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">
          DropHost
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Publish a site</h1>
        <p className="mt-2 text-slate-400">
          Upload the static files you already have. DropHost keeps the entry HTML and
          supporting assets together.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <SiteUploader userId={user.id} repository={repository} storage={storage} />
        </div>
      </section>
    </main>
  );
}
