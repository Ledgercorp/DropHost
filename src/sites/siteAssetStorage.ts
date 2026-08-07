import type { SupabaseClient } from "@supabase/supabase-js";

import type { SiteAssetStorage } from "./publishSite";

type SiteStorageClient = Pick<SupabaseClient, "storage">;

export function createSiteAssetStorage(
  client: SiteStorageClient,
): SiteAssetStorage {
  return {
    upload: async (path, file, mimeType) => {
      const { error } = await client.storage.from("site-assets").upload(path, file, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) {
        throw new Error(`Unable to upload site asset: ${error.message}`);
      }
    },
    publicUrl: (path) =>
      client.storage.from("site-assets").getPublicUrl(path).data.publicUrl,
    remove: async (paths) => {
      const { error } = await client.storage.from("site-assets").remove(paths);
      if (error) {
        throw new Error(`Unable to remove site assets: ${error.message}`);
      }
    },
  };
}
