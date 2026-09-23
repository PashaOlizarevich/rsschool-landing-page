const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

const categoryCases = [
  { name: "Coffee", count: 8, firstProduct: "Irish coffee" },
  { name: "Tea", count: 4, firstProduct: "Moroccan" },
  { name: "Dessert", count: 8, firstProduct: "Marble cheesecake" },
];

async function openCatalog(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${getBaseUrl()}/menu.html`);
  await expect(page.locator("#menu-list")).toHaveAttribute("aria-busy", "false");
}

test("catalog shows every category in full on desktop", async ({ page }) => {
  await openCatalog(page, 1440);
  const cards = page.locator(".product-card");
  const visibleCards = page.locator(".product-card:visible");
  const loadMore = page.locator("[data-load-more]");

  for (const category of categoryCases) {
    const tab = page.getByRole("tab", { name: category.name });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(cards).toHaveCount(category.count);
    await expect(visibleCards).toHaveCount(category.count);
    await expect(cards.first()).toContainText(category.firstProduct);
    await expect(loadMore).toBeHidden();
  }
});

test("compact catalog limits only categories with hidden products", async ({ page }) => {
  await openCatalog(page, 768);
  const cards = page.locator(".product-card");
  const visibleCards = page.locator(".product-card:visible");
  const loadMore = page.locator("[data-load-more]");

  for (const category of categoryCases) {
    await page.getByRole("tab", { name: category.name }).click();
    await expect(cards).toHaveCount(category.count);
    await expect(visibleCards).toHaveCount(Math.min(category.count, 4));

    if (category.count > 4) {
      await expect(loadMore).toBeVisible();
      await loadMore.click();
      await expect(visibleCards).toHaveCount(category.count);
      await expect(loadMore).toBeHidden();
    } else {
      await expect(loadMore).toBeHidden();
    }
  }
});

test("changing category resets the expanded compact state", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`${getBaseUrl()}/menu.html`);
  const visibleCards = page.locator(".product-card:visible");
  const loadMore = page.locator("[data-load-more]");

  await expect(visibleCards).toHaveCount(4);
  await expect(loadMore).toBeVisible();
  await loadMore.click();
  await expect(visibleCards).toHaveCount(8);

  await page.getByRole("tab", { name: "Tea" }).click();
  await expect(visibleCards).toHaveCount(4);
  await expect(loadMore).toBeHidden();

  await page.getByRole("tab", { name: "Dessert" }).click();
  await expect(visibleCards).toHaveCount(4);
  await expect(loadMore).toBeVisible();
});

test("crossing the 768px breakpoint resets the expanded state", async ({ page }) => {
  await openCatalog(page, 768);
  const visibleCards = page.locator(".product-card:visible");
  const loadMore = page.locator("[data-load-more]");

  await loadMore.click();
  await expect(visibleCards).toHaveCount(8);
  await page.setViewportSize({ width: 769, height: 900 });
  await expect(visibleCards).toHaveCount(8);
  await expect(loadMore).toBeHidden();

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(visibleCards).toHaveCount(4);
  await expect(loadMore).toBeVisible();
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
