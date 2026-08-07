import type { SupabaseClient } from "@supabase/supabase-js";

import { buildSlugCandidate } from "../lib/slug";
import type { Site, SiteFile } from "./types";

export interface SiteRepository {
  list(): Promise<Site[]>;
  create(input: {
    userId: string;
    name: string;
    slug: string;
    entryHtml: string;
  }): Promise<Site>;
  updateEntryHtml(siteId: string, entryHtml: string): Promise<void>;
  addFiles(siteId: string, files: Omit<SiteFile, "id">[]): Promise<void>;
  rename(siteId: string, name: string): Promise<void>;
  delete(siteId: string): Promise<void>;
}

type SiteDatabaseClient = Pick<SupabaseClient, "from" | "storage">;

type SiteRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  entry_html: string;
  created_at: string;
  updated_at: string;
};

type StoragePathRow = {
  storage_path: string;
};

const siteColumns = "id,user_id,name,slug,entry_html,created_at,updated_at";
const maxSlugAttempts = 25;

function mapSite(row: SiteRow): Site {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    entryHtml: row.entry_html,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSiteRepository(client: SiteDatabaseClient): SiteRepository {
  return {
    list: async () => {
      const { data, error } = await client
        .from("sites")
        .select(siteColumns)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      return ((data ?? []) as SiteRow[]).map(mapSite);
    },
    create: async (input) => {
      let attempt = 1;

      while (true) {
        const slug = buildSlugCandidate(input.slug, attempt);
        const { data, error } = await client
          .from("sites")
          .insert({
            user_id: input.userId,
            name: input.name,
            slug,
            entry_html: input.entryHtml,
          })
          .select(siteColumns)
          .single();
        if (error) {
          if (error.code !== "23505") {
            throw new Error(error.message);
          }
          if (attempt >= maxSlugAttempts) {
            throw new Error("Unable to reserve an available site URL");
          }
          attempt += 1;
          continue;
        }
        if (!data) throw new Error("Site creation returned no site");

        return mapSite(data as SiteRow);
      }
    },
    updateEntryHtml: async (siteId, entryHtml) => {
      const { error } = await client
        .from("sites")
        .update({ entry_html: entryHtml })
        .eq("id", siteId);
      if (error) throw new Error(error.message);
    },
    addFiles: async (siteId, files) => {
      const { error } = await client.from("site_files").insert(
        files.map((file) => ({
          site_id: siteId,
          relative_path: file.relativePath,
          storage_path: file.storagePath,
          mime_type: file.mimeType,
        })),
      );
      if (error) throw new Error(error.message);
    },
    rename: async (siteId, name) => {
      const { error } = await client.from("sites").update({ name }).eq("id", siteId);
      if (error) throw new Error(error.message);
    },
    delete: async (siteId) => {
      const { data: fileRows, error: fileError } = await client
        .from("site_files")
        .select("storage_path")
        .eq("site_id", siteId);
      if (fileError) throw new Error(fileError.message);

      const storagePaths = ((fileRows ?? []) as StoragePathRow[]).map(
        (row) => row.storage_path,
      );
      if (storagePaths.length > 0) {
        const { error: storageError } = await client.storage
          .from("site-assets")
          .remove(storagePaths);
        if (storageError) {
          throw new Error(`Unable to delete site files: ${storageError.message}`);
        }
      }

      const { error: siteError } = await client
        .from("sites")
        .delete()
        .eq("id", siteId);
      if (siteError) throw new Error(siteError.message);
    },
  };
}
