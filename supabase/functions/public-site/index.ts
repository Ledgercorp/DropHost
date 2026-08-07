import { withSupabase } from "npm:@supabase/server@1.4.1";

import {
  createPublicSiteHandler,
  type SiteLookup,
} from "../_shared/public-site-handler.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (request, context) => {
    const lookup: SiteLookup = async (slug) => {
      const { data, error } = await context.supabaseAdmin
        .from("sites")
        .select("name,slug,entry_html")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        name: data.name,
        slug: data.slug,
        entry_html: data.entry_html,
      };
    };

    return createPublicSiteHandler(lookup)(request);
  }),
};
