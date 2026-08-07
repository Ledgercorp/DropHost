export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "site";
}

export function buildSlugCandidate(value: string, attempt: number): string {
  const base = slugify(value);
  return attempt <= 1 ? base : `${base}-${attempt}`;
}
