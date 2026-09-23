const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

test.beforeEach(async ({ page }) => {
  await page.goto(`${getBaseUrl()}/menu.html`);
  await expect(page.locator(".product-card")).toHaveCount(8);
});

test("modal fills data, traps focus and restores its trigger", async ({ page }) => {
  const firstCard = page.locator(".product-card").first();
  const modal = page.locator("#product-modal");
  await firstCard.click();
  await expect(modal).toBeVisible();
  await expect(page.locator("[data-modal-title]")).toHaveText("Irish coffee");
  await expect(page.locator("[data-modal-media] img")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator('[data-modal-sizes] .product-option').first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("[data-modal-close]")).toBeFocused();
  await page.locator(".product-modal__content").click();
  await expect(modal).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(firstCard).toBeFocused();
  await firstCard.click();
  await page.mouse.click(5, 5);
  await expect(modal).toBeHidden();
});

test("product options update price and reset", async ({ page }) => {
  const cards = page.locator(".product-card");
  const sizes = page.locator('[data-modal-sizes] .product-option');
  const additives = page.locator('[data-modal-additives] .product-option');
  const price = page.locator("[data-modal-price]");
  await cards.nth(0).click();
  await expect(price).toHaveText("$7.00");
  await sizes.nth(1).click();
  await additives.nth(0).click();
  await additives.nth(1).click();
  await expect(price).toHaveText("$8.50");
  await page.locator("[data-modal-close]").click();
  await cards.nth(1).click();
  await expect(sizes.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(additives.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(price).toHaveText("$7.00");
});
