import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Trash2, Loader2, Globe, UploadCloud } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const list = await base44.entities.Site.filter(
          { created_by_id: user.id },
          "-created_date",
          100,
        );
        if (active) setSites(list);
      } catch (e) {
        if (active) setSites([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleDelete = async (site) => {
    if (!window.confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    setDeletingId(site.id);
    try {
      await base44.entities.SiteFile.deleteMany({ siteId: site.id });
      await base44.entities.Site.delete(site.id);
      setSites((s) => s.filter((x) => x.id !== site.id));
    } catch (e) {
      window.alert(e.message || "Failed to delete site");
    } finally {
      setDeletingId(null);
    }
  };

  const viewUrl = (slug) => `${window.location.origin}/view/${slug}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground text-lg">DropHost</span>
          </div>
          <Button onClick={() => (window.location.href = "/upload")}>
            <UploadCloud className="w-4 h-4" />
            New site
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your sites</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Drag, drop, share — live in seconds.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center">
            <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No sites yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Upload an HTML file or a ZIP to publish your first site.
            </p>
            <Button onClick={() => (window.location.href = "/upload")}>
              <Plus className="w-4 h-4" />
              Upload a site
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="group rounded-xl border border-border bg-card p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <button
                    onClick={() => handleDelete(site)}
                    disabled={deletingId === site.id}
                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === site.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <h3 className="font-semibold text-foreground truncate">{site.name}</h3>
                <p className="text-muted-foreground text-xs mt-1 truncate">
                  /view/{site.slug}
                </p>
                <div className="mt-4 flex gap-2">
                  <a
                    href={viewUrl(site.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-3 hover:bg-primary/90"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(viewUrl(site.slug));
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-border text-foreground text-sm h-9 px-3 hover:bg-muted"
                    title="Copy link"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}