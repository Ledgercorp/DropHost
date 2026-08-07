export type Site = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  entryHtml: string;
  createdAt: string;
  updatedAt: string;
};

export type SiteFile = {
  id: string;
  siteId: string;
  relativePath: string;
  storagePath: string;
  mimeType: string;
};
