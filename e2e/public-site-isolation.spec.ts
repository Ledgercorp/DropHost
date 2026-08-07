import { expect, test } from "@playwright/test";

test("hosted HTML cannot mutate DropHost parent storage", async ({ page }) => {
  await page.route("**/functions/v1/public-site?slug=malicious", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "Isolation fixture",
        slug: "malicious",
        entryHtml: `<!doctype html>
          <body>
            <script>
              try {
                parent.localStorage.setItem("drophost-escape", "compromised");
              } catch (_) {}
              document.body.dataset.executed = "true";
            </script>
          </body>`,
      }),
    });
  });

  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("drophost-escape", "safe"));
  await page.goto("/view/malicious");

  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-forms allow-modals allow-popups",
  );
  await expect(frame).not.toHaveAttribute("sandbox", /allow-same-origin/);
  await expect(page.frameLocator("iframe").locator("body")).toHaveAttribute(
    "data-executed",
    "true",
  );

  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("drophost-escape")),
    )
    .toBe("safe");
});
