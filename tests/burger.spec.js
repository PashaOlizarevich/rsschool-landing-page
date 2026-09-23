const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");
const getBaseUrl = useStaticServer(test);

const pages = ["index.html", "menu.html"];

async function expectMenuClosed(page) {
  const toggle = page.locator(".burger-button");
  const menu = page.locator(".mobile-menu");

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-label", "Open navigation menu");
  await expect(menu).toHaveAttribute("aria-hidden", "true");
  await expect(menu).toHaveAttribute("inert", "");
  await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);
  await expect(page.locator("body")).not.toHaveClass(/scroll-locked/);
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.locator("footer")).not.toHaveAttribute("inert", "");
}

async function openMenu(page) {
  const toggle = page.locator(".burger-button");
  const menu = page.locator(".mobile-menu");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Close navigation menu");
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await expect(menu).not.toHaveAttribute("inert", "");
  await expect(menu.locator("a").first()).toBeFocused();
  await expect(page.locator("html")).toHaveClass(/scroll-locked/);
  await expect(page.locator("body")).toHaveClass(/scroll-locked/);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(page.locator("footer")).toHaveAttribute("inert", "");
}

for (const pagePath of pages) {
  test.describe(`burger menu on ${pagePath}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 900 });
      await page.goto(`${getBaseUrl()}/${pagePath}`);
    });

    test("opens and closes with the button and restores focus and scrolling", async ({ page }) => {
      const toggle = page.locator(".burger-button");

      await expectMenuClosed(page);
      await openMenu(page);
      await toggle.click();

      await expectMenuClosed(page);
      await expect(toggle).toBeFocused();
    });

    test("closes from a navigation link", async ({ page }) => {
      await openMenu(page);
      await page.locator('.mobile-menu a[href="#contacts"]').click();

      await expect(page).toHaveURL(/#contacts$/);
      await expectMenuClosed(page);
    });

    test("closes with Escape and restores focus", async ({ page }) => {
      const toggle = page.locator(".burger-button");

      await openMenu(page);
      await page.keyboard.press("Escape");

      await expectMenuClosed(page);
      await expect(toggle).toBeFocused();
    });

    test("closes at the 768 to 769 px breakpoint and restores desktop navigation", async ({
      page,
    }) => {
      const toggle = page.locator(".burger-button");
      const desktopNavigation = page.locator(".header__navigation");
      const desktopFocusTarget = desktopNavigation.locator("a").first();

      await openMenu(page);
      await page.setViewportSize({ width: 769, height: 900 });

      await expectMenuClosed(page);
      await expect(toggle).toBeHidden();
      await expect(desktopNavigation).toBeVisible();
      await expect(desktopFocusTarget).toBeFocused();
    });
  });
}
