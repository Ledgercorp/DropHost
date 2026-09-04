import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";

export default function View() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const results = await base44.entities.Site.filter({ slug }, undefined, 1);
        if (!active) return;
        if (!results || !results.length) {
          setError("Site not found");
          setLoading(false);
          return;
        }
        setSite(results[0]);
        setLoading(false);
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load site");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const srcDoc = useMemo(() => {
    if (!site?.entryHtml) return "";
    return site.entryHtml
      .replace(/\scrossorigin(=["'][^"']*["'])?/gi, "")
      .replace(/\sintegrity(=["'][^"']*["'])?/gi, "");
  }, [site]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{error}</h1>
          <p className="text-muted-foreground text-sm">
            The site you're looking for may have been removed or never existed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      className="w-full h-screen border-0"
      title={site.name}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
    />
  );
}