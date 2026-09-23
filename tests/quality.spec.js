const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "intermediate", width: 1024, height: 800 },
  { name: "tablet", width: 768, height: 800 },
  { name: "mobile", width: 380, height: 800 },
]) {
  test(`mouse and keyboard smoke at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    const failed = [];
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failed.push(request.url()));
    await page.goto(`${getBaseUrl()}/index.html`);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.locator(".theme-toggle").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    if (viewport.width <= 768) {
      await page.locator(".burger-button").click();
      await expect(page.locator(".burger-button")).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
    } else {
      await page.locator(".slider__control--next").click();
      await expect(page.locator('.slider__item[aria-hidden="false"]')).toHaveCount(1);
    }
    await page.goto(`${getBaseUrl()}/menu.html`);
    await expect(page.locator(".product-card:visible")).toHaveCount(viewport.width <= 768 ? 4 : 8);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.locator('[data-category="tea"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-category="dessert"]')).toHaveAttribute("aria-selected", "true");
    await page.locator(".product-card").first().press("Enter");
    await expect(page.locator("#product-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
}

test("documents expose basic semantic structure", async ({ page }) => {
  for (const path of ["index.html", "menu.html"]) {
    await page.goto(`${getBaseUrl()}/${path}`);
    await expect(page.locator("body > header, body > main, body > footer")).toHaveCount(3);
    await expect(page.locator("h1")).toHaveCount(1);
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds).toEqual([]);
    expect(await page.locator("img:not([alt])").count()).toBe(0);
  }
});
