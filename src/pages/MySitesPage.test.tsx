import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { SiteRepository } from "../sites/siteRepository";
import type { Site } from "../sites/types";
import { MySitesPage } from "./MySitesPage";

function site(id: string, name: string, slug: string): Site {
  return {
    id,
    userId: "user-1",
    name,
    slug,
    entryHtml: `<h1>${name}</h1>`,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
  };
}

function createStatefulRepository(initialSites: Site[]): SiteRepository {
  let sites = [...initialSites];

  return {
    list: async () => [...sites],
    create: async (input) => {
      const created = site(`site-${sites.length + 1}`, input.name, input.slug);
      sites = [...sites, created];
      return created;
    },
    updateEntryHtml: async () => undefined,
    addFiles: async () => undefined,
    rename: async (siteId, name) => {
      sites = sites.map((current) =>
        current.id === siteId ? { ...current, name } : current,
      );
    },
    delete: async (siteId) => {
      sites = sites.filter((current) => current.id !== siteId);
    },
  };
}

function renderMySites(repository: SiteRepository) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MySitesPage repository={repository} />
    </MemoryRouter>,
  );
}

describe("MySitesPage", () => {
  it("provides a visible path to publish another site", () => {
    renderMySites(createStatefulRepository([]));

    expect(screen.getByRole("link", { name: "Publish a site" })).toHaveAttribute(
      "href",
      "/upload",
    );
  });

  it("lists the current user's returned sites", async () => {
    renderMySites(
      createStatefulRepository([
        site("site-1", "Portfolio", "portfolio"),
        site("site-2", "Landing Page", "landing-page"),
      ]),
    );

    expect(await screen.findByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("copies the absolute public site URL", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    renderMySites(
      createStatefulRepository([site("site-1", "Portfolio", "portfolio")]),
    );
    await screen.findByText("Portfolio");

    await user.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/view/portfolio`,
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });

  it("opens the site's public viewer", async () => {
    renderMySites(
      createStatefulRepository([site("site-1", "Portfolio", "portfolio")]),
    );
    await screen.findByText("Portfolio");

    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/view/portfolio",
    );
  });

  it("persists a rename and refreshes the visible site name", async () => {
    const user = userEvent.setup();
    renderMySites(
      createStatefulRepository([site("site-1", "Portfolio", "portfolio")]),
    );
    await screen.findByText("Portfolio");

    await user.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByLabelText("New site name");
    await user.clear(input);
    await user.type(input, "Work Samples");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByText("Work Samples")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio")).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting a site and removes it after success", async () => {
    const user = userEvent.setup();
    renderMySites(
      createStatefulRepository([site("site-1", "Portfolio", "portfolio")]),
    );
    await screen.findByText("Portfolio");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Hosted assets are removed with the site");

    await user.click(screen.getByRole("button", { name: "Delete site" }));
    await waitFor(() => {
      expect(screen.queryByText("Portfolio")).not.toBeInTheDocument();
    });
  });
});
