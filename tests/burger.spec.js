const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const projectRoot = path.resolve(__dirname, "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
};

let server;
let baseUrl;

test.beforeAll(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(projectRoot, relativePath);

    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const contents = await fs.readFile(filePath);
      const contentType = contentTypes[path.extname(filePath)] ?? "application/octet-stream";

      response.writeHead(200, { "Content-Type": contentType });
      response.end(contents);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

for (const pagePath of ["index.html", "menu.html"]) {
  test(`burger menu is accessible on ${pagePath}`, async ({ page }) => {
    const consoleErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`${baseUrl}/${pagePath}`);

    const toggle = page.locator(".burger-button");
    const menu = page.locator(".mobile-menu");
    const firstLink = menu.locator("a").first();

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveAttribute("aria-hidden", "true");

    await toggle.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-label", "Close navigation menu");
    await expect(menu).toHaveAttribute("aria-hidden", "false");
    await expect(firstLink).toBeFocused();
    await expect(page.locator("html")).toHaveClass(/scroll-locked/);
    await expect(page.locator("body")).toHaveClass(/scroll-locked/);

    if (process.env.BURGER_QA_SCREENSHOT && pagePath === "index.html") {
      await page.screenshot({ path: process.env.BURGER_QA_SCREENSHOT });
    }

    await page.keyboard.press("Escape");

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(/scroll-locked/);
    await expect(page.locator("body")).not.toHaveClass(/scroll-locked/);

    await toggle.click();
    await firstLink.click();

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("body")).not.toHaveClass(/scroll-locked/);

    await toggle.click();
    await page.setViewportSize({ width: 769, height: 900 });

    await expect(toggle).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("body")).not.toHaveClass(/scroll-locked/);
    await expect(page.locator(".header__navigation a").first()).toBeFocused();
    expect(consoleErrors).toEqual([]);
  });
}
