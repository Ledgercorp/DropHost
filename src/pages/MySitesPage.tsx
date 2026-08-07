import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { SiteCard } from "../components/SiteCard";
import type { SiteRepository } from "../sites/siteRepository";
import type { Site } from "../sites/types";

export function MySitesPage({ repository }: { repository: SiteRepository }) {
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    void repository.list().then(setSites);
  }, [repository]);

  async function renameSite(siteId: string, name: string) {
    await repository.rename(siteId, name);
    setSites((current) =>
      current.map((site) => (site.id === siteId ? { ...site, name } : site)),
    );
  }

  async function deleteSite(siteId: string) {
    await repository.delete(siteId);
    setSites((current) => current.filter((site) => site.id !== siteId));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-400">
          DropHost
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">My sites</h1>
          <Link
            to="/upload"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Publish a site
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onRename={(name) => renameSite(site.id, name)}
              onDelete={() => deleteSite(site.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
