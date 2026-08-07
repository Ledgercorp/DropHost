import { useState, type FormEvent } from "react";

import type { Site } from "../sites/types";

export function SiteCard({
  site,
  onRename,
  onDelete,
}: {
  site: Site;
  onRename(name: string): Promise<void>;
  onDelete(): Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draftName, setDraftName] = useState(site.name);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/view/${site.slug}`);
    setCopied(true);
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    await onRename(draftName.trim());
    setRenaming(false);
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-white">{site.name}</h2>
      {renaming ? (
        <form onSubmit={(event) => void saveName(event)} className="mt-4 space-y-3">
          <label className="block text-sm text-slate-300">
            New site name
            <input
              required
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <button type="submit" className="text-sm font-semibold text-sky-300">
            Save name
          </button>
        </form>
      ) : (
        <div className="mt-4 flex gap-4">
          <a
            href={`/view/${site.slug}`}
            className="text-sm font-medium text-sky-300 hover:text-sky-200"
          >
            Open
          </a>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="text-sm font-medium text-sky-300 hover:text-sky-200"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="text-sm font-medium text-slate-300 hover:text-white"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm font-medium text-rose-300 hover:text-rose-200"
          >
            Delete
          </button>
        </div>
      )}
      {confirmingDelete && (
        <div
          role="dialog"
          aria-label={`Delete ${site.name}`}
          className="mt-4 rounded-lg border border-rose-900/70 bg-rose-950/30 p-4"
        >
          <p className="text-sm text-slate-200">
            Hosted assets are removed with the site. This cannot be undone.
          </p>
          <div className="mt-3 flex gap-4">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sm font-semibold text-rose-300 hover:text-rose-200"
            >
              Delete site
            </button>
          </div>
        </div>
      )}
      {copied && <p role="status" className="mt-2 text-sm text-emerald-300">Link copied</p>}
    </article>
  );
}
