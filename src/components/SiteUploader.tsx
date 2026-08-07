import { useState, type FormEvent } from "react";

import {
  prepareLooseFiles,
  prepareZip,
  SitePreparationError,
} from "../lib/archive";
import {
  publishPreparedSite,
  type SiteAssetStorage,
} from "../sites/publishSite";
import type { SiteRepository } from "../sites/siteRepository";
import type { Site } from "../sites/types";

export function SiteUploader({
  userId,
  repository,
  storage,
}: {
  userId: string;
  repository: SiteRepository;
  storage: SiteAssetStorage;
}) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<Site | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPublished(null);
    setSubmitting(true);

    try {
      if (files.length === 0) {
        throw new Error("Select site files or a ZIP");
      }

      const prepared = files.length === 1 && /\.zip$/i.test(files[0].name)
        ? await prepareZip(files[0])
        : await prepareLooseFiles(files);
      const site = await publishPreparedSite({
        userId,
        name,
        prepared,
        repository,
        storage,
      });
      setPublished(site);
    } catch (caught) {
      setError(
        caught instanceof SitePreparationError &&
          (caught.code === "INVALID_ARCHIVE" || caught.code === "ENTRY_HTML_MISSING")
          ? caught.message
          : "Unable to publish site",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block text-sm font-medium text-slate-200">
        Site name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />
      </label>

      <label className="block text-sm font-medium text-slate-200">
        Site files or ZIP
        <input
          type="file"
          multiple
          onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))}
          className="mt-2 block w-full text-sm text-slate-300"
        />
      </label>

      <div className="border-t border-slate-800 pt-5">
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          Or choose a folder
        </p>
        <label className="block text-sm font-medium text-slate-200">
          Site folder
          <input
            type="file"
            multiple
            {...({ webkitdirectory: "" } as Record<string, string>)}
            onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))}
            className="mt-2 block w-full text-sm text-slate-300"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {published && (
        <p role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-200">
          Published successfully.{" "}
          <a className="font-semibold underline" href={`/view/${published.slug}`}>
            Open published site
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
      >
        Publish site
      </button>
    </form>
  );
}
