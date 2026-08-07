export type PublicSiteRecord = {
  name: string;
  slug: string;
  entry_html: string;
};

export type SiteLookup = (slug: string) => Promise<PublicSiteRecord | null>;

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

export function createPublicSiteHandler(
  lookup: SiteLookup,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET") {
      const slug = new URL(request.url).searchParams.get("slug")?.trim();
      if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return json({ error: "Missing or invalid site slug" }, 400);
      }

      let site: PublicSiteRecord | null;
      try {
        site = await lookup(slug);
      } catch {
        return json({ error: "Unable to load site" }, 500);
      }

      if (!site) {
        return json({ error: "Site not found" }, 404);
      }

      return json(
        {
          name: site.name,
          slug: site.slug,
          entryHtml: site.entry_html,
        },
        200,
      );
    }

    return Response.json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: { ...corsHeaders, Allow: "GET, OPTIONS" },
      },
    );
  };
}
