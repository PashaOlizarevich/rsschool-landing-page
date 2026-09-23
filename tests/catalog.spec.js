const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

test("catalog switches categories and expands compact results", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`${getBaseUrl()}/menu.html`);
  const cards = page.locator(".product-card");
  const loadMore = page.locator("[data-load-more]");
  await expect(cards).toHaveCount(8);
  await expect(page.locator(".product-card:visible")).toHaveCount(4);
  await expect(loadMore).toBeVisible();
  await loadMore.click();
  await expect(page.locator(".product-card:visible")).toHaveCount(8);
  await page.getByRole("tab", { name: "Tea" }).click();
  await expect(cards).toHaveCount(4);
  await expect(loadMore).toBeHidden();
  await page.getByRole("tab", { name: "Dessert" }).click();
  await expect(cards).toHaveCount(8);
  await page.setViewportSize({ width: 769, height: 900 });
  await expect(page.locator(".product-card:visible")).toHaveCount(8);
});

test("catalog displays an error and supports retry", async ({ page }) => {
  let shouldFail = true;
  await page.route("**/public/data/products.json", async (route) => {
    if (shouldFail) await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto(`${getBaseUrl()}/menu.html`);
  await expect(page.getByRole("alert")).toContainText("couldn’t load the menu");
  await expect(page.getByRole("tab", { name: "Coffee" })).toBeDisabled();
  shouldFail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
});
