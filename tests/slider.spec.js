const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

test("slider cycles in both directions and survives resize", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${getBaseUrl()}/index.html`);
  const slides = page.locator(".slider__item");
  const indicators = page.locator(".slider__indicator");
  await expect(indicators.nth(0)).toHaveAttribute("aria-current", "true");
  await page.locator(".slider__control--previous").click();
  await expect(indicators.nth(2)).toHaveAttribute("aria-current", "true");
  await expect(slides.nth(2)).toHaveAttribute("aria-hidden", "false");
  await page.locator(".slider__control--next").click();
  await expect(indicators.nth(0)).toHaveAttribute("aria-current", "true");
  await indicators.nth(1).click();
  await expect(indicators.nth(1)).toHaveAttribute("aria-current", "true");
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(indicators.nth(1)).toHaveAttribute("aria-current", "true");
  await page.setViewportSize({ width: 380, height: 800 });
  await expect(slides.nth(1)).toHaveAttribute("aria-hidden", "false");
});
