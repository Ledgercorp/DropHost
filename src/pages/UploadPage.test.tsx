import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@supabase/supabase-js";
import JSZip from "jszip";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthContext, type AuthContextValue } from "../auth/authContext";
import type { SiteAssetStorage } from "../sites/publishSite";
import type { SiteRepository } from "../sites/siteRepository";
import type { Site } from "../sites/types";
import { UploadPage } from "./UploadPage";

const testUser: User = {
  id: "user-1",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-08-01T12:00:00.000Z",
  email: "user@example.com",
};

const authValue: AuthContextValue = {
  user: testUser,
  loading: false,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signInWithGoogle: async () => undefined,
  requestPasswordReset: async () => undefined,
  updatePassword: async () => undefined,
  signOut: async () => undefined,
};

function makeSite(input: {
  userId: string;
  name: string;
  slug: string;
  entryHtml: string;
}): Site {
  return {
    id: "site-1",
    ...input,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  };
}

function createRepository(): SiteRepository {
  return {
    list: async () => [],
    create: async (input) => makeSite(input),
    updateEntryHtml: async () => undefined,
    addFiles: async () => undefined,
    rename: async () => undefined,
    delete: async () => undefined,
  };
}

function createStorage(): SiteAssetStorage {
  return {
    upload: async () => undefined,
    publicUrl: (path) => `https://cdn.test/${path}`,
    remove: async () => undefined,
  };
}

function renderUploadPage(
  repository = createRepository(),
  storage = createStorage(),
) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={authValue}>
        <UploadPage repository={repository} storage={storage} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

async function createZipFile(entries: Record<string, string>, name = "site.zip") {
  const zip = new JSZip();
  for (const [path, contents] of Object.entries(entries)) {
    zip.file(path, contents);
  }
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes], name, { type: "application/zip" });
}

describe("UploadPage", () => {
  it("publishes a single HTML file and links the resulting public site", async () => {
    const user = userEvent.setup();
    renderUploadPage();

    await user.type(screen.getByLabelText("Site name"), "Single Site");
    await user.upload(
      screen.getByLabelText("Site files or ZIP"),
      new File(["<!doctype html><h1>Hello</h1>"], "index.html", {
        type: "text/html",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Publish site" }));

    const link = await screen.findByRole("link", { name: "Open published site" });
    expect(link).toHaveAttribute("href", "/view/single-site");
  });

  it("publishes a ZIP package through archive preparation", async () => {
    const uploadedPaths: string[] = [];
    const storage: SiteAssetStorage = {
      ...createStorage(),
      upload: async (path) => {
        uploadedPaths.push(path);
      },
    };
    const user = userEvent.setup();
    renderUploadPage(createRepository(), storage);

    await user.type(screen.getByLabelText("Site name"), "ZIP Site");
    await user.upload(
      screen.getByLabelText("Site files or ZIP"),
      await createZipFile({
        "index.html": '<link href="style.css"><h1>ZIP</h1>',
        "style.css": "body { color: white; }",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Publish site" }));

    const link = await screen.findByRole("link", { name: "Open published site" });
    expect(link).toHaveAttribute("href", "/view/zip-site");
    expect(uploadedPaths).toEqual(["user-1/site-1/style.css"]);
  });

  it("publishes multiple loose files as one prepared site", async () => {
    const uploadedPaths: string[] = [];
    const storage: SiteAssetStorage = {
      ...createStorage(),
      upload: async (path) => {
        uploadedPaths.push(path);
      },
    };
    const user = userEvent.setup();
    renderUploadPage(createRepository(), storage);

    await user.type(screen.getByLabelText("Site name"), "Loose Site");
    await user.upload(screen.getByLabelText("Site files or ZIP"), [
      new File(['<link href="style.css"><h1>Loose</h1>'], "index.html", {
        type: "text/html",
      }),
      new File(["body { color: white; }"], "style.css", { type: "text/css" }),
    ]);
    await user.click(screen.getByRole("button", { name: "Publish site" }));

    const link = await screen.findByRole("link", { name: "Open published site" });
    expect(link).toHaveAttribute("href", "/view/loose-site");
    expect(uploadedPaths).toEqual(["user-1/site-1/style.css"]);
  });

  it("shows the specific invalid ZIP error", async () => {
    const user = userEvent.setup();
    renderUploadPage();

    await user.type(screen.getByLabelText("Site name"), "Broken ZIP");
    await user.upload(
      screen.getByLabelText("Site files or ZIP"),
      new File(["not a zip archive"], "broken.zip", { type: "application/zip" }),
    );
    await user.click(screen.getByRole("button", { name: "Publish site" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid ZIP file");
  });

  it("shows the specific error when a ZIP has no HTML entry file", async () => {
    const user = userEvent.setup();
    renderUploadPage();

    await user.type(screen.getByLabelText("Site name"), "No Entry");
    await user.upload(
      screen.getByLabelText("Site files or ZIP"),
      await createZipFile({ "style.css": "body{}" }, "no-entry.zip"),
    );
    await user.click(screen.getByRole("button", { name: "Publish site" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No HTML entry file was found",
    );
  });

  it("disables duplicate submission while publishing is in progress", async () => {
    let finishPublishing!: () => void;
    const gate = new Promise<void>((resolve) => {
      finishPublishing = resolve;
    });
    const repository: SiteRepository = {
      ...createRepository(),
      create: async (input) => {
        await gate;
        return makeSite(input);
      },
    };
    const user = userEvent.setup();
    renderUploadPage(repository);

    await user.type(screen.getByLabelText("Site name"), "Slow Site");
    await user.upload(
      screen.getByLabelText("Site files or ZIP"),
      new File(["<h1>Slow</h1>"], "index.html", { type: "text/html" }),
    );
    const publishButton = screen.getByRole("button", { name: "Publish site" });
    await user.click(publishButton);

    expect(publishButton).toBeDisabled();
    finishPublishing();
    expect(
      await screen.findByRole("link", { name: "Open published site" }),
    ).toHaveAttribute("href", "/view/slow-site");
  });

  it("offers browser directory selection without requiring it", () => {
    renderUploadPage();

    const directoryInput = screen.getByLabelText("Site folder");
    expect(directoryInput).toHaveAttribute("webkitdirectory");
    expect(directoryInput).toHaveAttribute("multiple");
  });
});
