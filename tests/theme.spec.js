const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

test("theme persists across reloads and pages", async ({ page }) => {
  await page.goto(`${getBaseUrl()}/index.html`);
  await page.locator(".theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".theme-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto(`${getBaseUrl()}/menu.html`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
