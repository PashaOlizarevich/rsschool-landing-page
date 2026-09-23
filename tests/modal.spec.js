const { test, expect } = require("@playwright/test");
const products = require("../public/data/products.json");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

test.beforeEach(async ({ page }) => {
  await page.goto(`${getBaseUrl()}/menu.html`);
  await expect(page.locator(".product-card")).toHaveCount(8);
});

for (const category of ["coffee", "tea", "dessert"]) {
  test(`modal uses source data for ${category}`, async ({ page }) => {
    const product = products.find((item) => item.category === category);
    await page.locator(`[data-category="${category}"]`).click();
    await page.locator(".product-card").first().click();
    await expect(page.locator("[data-modal-title]")).toHaveText(product.name);
    await expect(page.locator("[data-modal-description]")).toHaveText(product.description);
    await expect(page.locator("[data-modal-price]")).toHaveText(`$${product.price}`);
    await expect(page.locator("[data-modal-media] img")).toBeVisible();
  });
}

test("close methods, focus containment, scroll lock and focus return work", async ({ page }) => {
  const card = page.locator(".product-card").first();
  const modal = page.locator("#product-modal");
  for (const method of ["button", "escape", "backdrop"]) {
    await card.click();
    await expect(modal).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/scroll-locked/);
    await page.locator(".product-modal__content").click();
    await expect(modal).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-modal-sizes] .product-option').first()).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("[data-modal-close]")).toBeFocused();
    if (method === "button") await page.locator("[data-modal-close]").click();
    if (method === "escape") await page.keyboard.press("Escape");
    if (method === "backdrop") await page.mouse.click(5, 5);
    await expect(modal).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/scroll-locked/);
    await expect(card).toBeFocused();
  }
});

test("modal remains usable in light and dark themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    const current = (await page.locator("html").getAttribute("data-theme")) || "light";
    if (current !== theme) await page.locator(".theme-toggle").click();
    await page.locator(".product-card").first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("#product-modal")).toBeVisible();
    await page.locator("[data-modal-close]").click();
  }
});

test("each size, additives and state reset update visual and price state", async ({ page }) => {
  const cards = page.locator(".product-card");
  const sizes = page.locator('[data-modal-sizes] .product-option');
  const additives = page.locator('[data-modal-additives] .product-option');
  const price = page.locator("[data-modal-price]");
  await cards.first().click();
  for (const [index, expected] of ["$7.00", "$7.50", "$8.00"].entries()) {
    await sizes.nth(index).click();
    await expect(sizes.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(price).toHaveText(expected);
  }
  await additives.nth(0).click();
  await expect(additives.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(price).toHaveText("$8.50");
  await additives.nth(1).click();
  await expect(additives.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(price).toHaveText("$9.00");
  await page.locator("[data-modal-close]").click();
  await cards.nth(1).click();
  await expect(sizes.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(sizes.nth(1)).toHaveAttribute("aria-pressed", "false");
  await expect(additives.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(price).toHaveText("$7.00");
});
