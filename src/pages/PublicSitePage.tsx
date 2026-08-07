import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type PublicSite = {
  name: string;
  slug: string;
  entryHtml: string;
};

export function PublicSitePage() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!slug) return;

    void fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-site?slug=${encodeURIComponent(slug)}`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      },
    )
      .then(async (response) => {
        if (response.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!response.ok) {
          setFailed(true);
          return null;
        }
        return response.json() as Promise<PublicSite>;
      })
      .then((loadedSite) => {
        if (loadedSite) setSite(loadedSite);
      })
      .catch(() => setFailed(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
        <section className="text-center">
          <h1 className="text-3xl font-semibold">Site not found</h1>
          <p className="mt-2 text-slate-400">
            This DropHost link does not point to a published site.
          </p>
        </section>
      </main>
    );
  }

  if (failed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
        <section className="text-center">
          <h1 className="text-3xl font-semibold">Unable to load site</h1>
          <p className="mt-2 text-slate-400">Try the link again in a moment.</p>
        </section>
      </main>
    );
  }

  if (!site) {
    return <p role="status">Loading site…</p>;
  }

  return (
    <main className="h-screen bg-slate-950 text-slate-100">
      <iframe
        title={site.name}
        srcDoc={site.entryHtml}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        className="h-full w-full border-0 bg-white"
      />
    </main>
  );
}
