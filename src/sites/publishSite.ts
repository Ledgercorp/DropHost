import type { PreparedSite } from "../lib/archive";
import { rewriteAssetReferences } from "../lib/html";
import { slugify } from "../lib/slug";
import type { SiteRepository } from "./siteRepository";
import type { Site, SiteFile } from "./types";

export interface SiteAssetStorage {
  upload(path: string, file: File, mimeType: string): Promise<void>;
  publicUrl(path: string): string;
  remove(paths: string[]): Promise<void>;
}

export async function publishPreparedSite(input: {
  userId: string;
  name: string;
  prepared: PreparedSite;
  repository: SiteRepository;
  storage: SiteAssetStorage;
}): Promise<Site> {
  const site = await input.repository.create({
    userId: input.userId,
    name: input.name,
    slug: slugify(input.name),
    entryHtml: input.prepared.entryHtml,
  });

  const files: Omit<SiteFile, "id">[] = [];
  try {
    for (const asset of input.prepared.assets) {
      const storagePath = `${input.userId}/${site.id}/${asset.relativePath}`;
      await input.storage.upload(storagePath, asset.file, asset.mimeType);
      files.push({
        siteId: site.id,
        relativePath: asset.relativePath,
        storagePath,
        mimeType: asset.mimeType,
      });
    }

    const publicUrls = new Map(
      files.map((file) => [
        file.relativePath,
        input.storage.publicUrl(file.storagePath),
      ]),
    );
    const entryHtml = rewriteAssetReferences(
      input.prepared.entryHtml,
      publicUrls,
      input.prepared.entryPath,
    );

    await input.repository.updateEntryHtml(site.id, entryHtml);
    if (files.length > 0) {
      await input.repository.addFiles(site.id, files);
    }

    return { ...site, entryHtml };
  } catch (error) {
    const uploadedPaths = files.map((file) => file.storagePath);
    if (uploadedPaths.length > 0) {
      try {
        await input.storage.remove(uploadedPaths);
      } catch {
        // Preserve the publication failure while continuing best-effort cleanup.
      }
    }
    try {
      await input.repository.delete(site.id);
    } catch {
      // The original publication error is more useful to the caller.
    }
    throw error;
  }
}
