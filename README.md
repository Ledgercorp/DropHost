# DropHost

DropHost is an independent technical project for publishing small static websites from the files that already make up the site. A user can upload a ZIP archive, a folder, or a set of loose files, and DropHost validates the package, identifies the entry HTML, publishes supporting assets, and gives the finished site a shareable URL.

I built it to work through the parts of software delivery that become important once a prototype has to behave like a real system: authentication, user isolation, archive handling, storage permissions, failure cleanup, public rendering, and repeatable tests.

## What it does

- Accepts static sites as ZIP archives, folders, or loose files.
- Rejects unsafe archive paths and packages without a usable HTML entry point.
- Preserves nested asset paths and rewrites references for hosted assets.
- Publishes assets to Supabase Storage under user- and site-scoped paths.
- Stores site metadata in Postgres with Row Level Security around each user's records.
- Handles slug collisions without silently replacing an existing site.
- Lets a signed-in user list, open, rename, share, and delete published sites.
- Removes hosted assets before deleting the site's database record.
- Serves public site metadata through a small Supabase Edge Function rather than exposing the application tables anonymously.
- Renders user-supplied HTML in a sandboxed iframe without `allow-same-origin`, isolating it from the DropHost application origin.

DropHost is a working portfolio project, not a claim to be a production hosting provider. The security choices in the repository are deliberate, but a public commercial service would still need abuse controls, quotas, monitoring, and additional operational hardening.

## System shape

```text
Browser
  |
  |  authenticated application requests
  v
Supabase Auth ----> Postgres
                      |  sites + site_files
                      |  ownership enforced with RLS
                      v
                 Supabase Storage
                      |  public site assets
                      |  authenticated writes only
                      v
Public viewer ----> Edge Function ----> site entry HTML
       |
       v
sandboxed iframe
```

The browser uses a Supabase publishable key, which is designed to be public. Secret and service-role credentials are never part of the client configuration.

## Security decisions

The application treats uploaded websites as untrusted content.

- `sites` and `site_files` have Row Level Security enabled.
- Anonymous database access is not granted to those application tables.
- Authenticated table policies check ownership with `auth.uid()` rather than relying on the authenticated role alone.
- Storage writes must land under the authenticated user's ID and an owned site ID.
- The asset bucket is public because published websites need public assets. Upload, update, and delete operations remain policy-controlled.
- ZIP paths are normalized and checked before extraction to prevent traversal outside the expected package structure.
- Public HTML is returned by a purpose-built read-only Edge Function.
- The viewer iframe permits the behavior a static site may need while withholding same-origin access to the DropHost application.

The Supabase security advisor reports no security findings against the current project schema.

## Stack

- React 18 + TypeScript
- Vite
- Supabase Auth, Postgres, Storage, and Edge Functions
- JSZip for archive ingestion
- Vitest + Testing Library
- Playwright for browser-level isolation checks
- Vercel-compatible SPA routing

Dependencies are pinned and the npm lockfile is committed so the project can be reproduced from a clean checkout.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set these browser-safe values in `.env.local`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Do not place a Supabase secret key or service-role key in a `VITE_` variable.

The database/storage setup is in `supabase/schema.sql`. The public viewer function is in `supabase/functions/public-site/` and is configured in `supabase/config.toml`.

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

The automated coverage focuses on the failure cases that matter for this project, including unsafe ZIP paths, missing entry HTML, asset rewriting, slug collisions, partial-publication cleanup, user-facing auth errors, CRUD behavior, and iframe origin isolation.

## How I built it

This is an AI-assisted project. I use coding agents as implementation partners, while I define the product behavior, break the work into concrete requirements, review the generated changes, test edge cases, trace integration failures, and decide what is good enough to keep.

My broader view is that as AI systems become more capable, learning how to collaborate with them well becomes increasingly valuable. For the kind of work I want to do, I am deliberately learning how to give agents useful context, inspect what they produce, catch bad assumptions, and turn an idea into a tested system instead of treating hand-coding every line from scratch as the only meaningful technical skill.

That is also why the repository includes the less visible parts of the work. The tests, access policies, failure handling, deployment configuration, and security boundaries are part of the project, not just the interface.
