const { test, expect } = require("@playwright/test");
const { useStaticServer } = require("./helpers/static-server");

const getBaseUrl = useStaticServer(test);

const SLIDE_COUNT = 3;

async function expectActiveSlide(page, activeIndex) {
  const slides = page.locator(".slider__item");
  const indicators = page.locator(".slider__indicator");

  await expect(slides).toHaveCount(SLIDE_COUNT);
  await expect(indicators).toHaveCount(SLIDE_COUNT);

  for (let index = 0; index < SLIDE_COUNT; index += 1) {
    const isActive = index === activeIndex;

    await expect(slides.nth(index)).toHaveAttribute("aria-hidden", String(!isActive));
    await expect(slides.nth(index)).toHaveClass(
      isActive ? /slider__item--active/ : /^(?!.*slider__item--active)/,
    );
    await expect(indicators.nth(index)).toHaveClass(
      isActive ? /slider__indicator--active/ : /^(?!.*slider__indicator--active)/,
    );

    if (isActive) {
      await expect(indicators.nth(index)).toHaveAttribute("aria-current", "true");
    } else {
      await expect(indicators.nth(index)).not.toHaveAttribute("aria-current", /.+/);
    }
  }
}

async function expectSettledTransform(page, activeIndex) {
  await expect
    .poll(async () =>
      page.locator(".slider__list").evaluate((list, index) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(list).transform);
        const viewport = list.closest(".slider__viewport");
        const expected = -index * viewport.getBoundingClientRect().width;

        return Math.abs(matrix.m41 - expected);
      }, activeIndex),
    )
    .toBeLessThan(1);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${getBaseUrl()}/index.html`);
  await expectActiveSlide(page, 0);
});

test("slider moves forward and cycles from the last slide to the first", async ({ page }) => {
  const next = page.locator(".slider__control--next");

  await next.click();
  await expectActiveSlide(page, 1);
  await next.click();
  await expectActiveSlide(page, 2);
  await next.click();
  await expectActiveSlide(page, 0);
  await expectSettledTransform(page, 0);
});

test("slider moves backward and cycles from the first slide to the last", async ({ page }) => {
  const previous = page.locator(".slider__control--previous");

  await previous.click();
  await expectActiveSlide(page, 2);
  await previous.click();
  await expectActiveSlide(page, 1);
  await previous.click();
  await expectActiveSlide(page, 0);
});

test("each indicator selects its slide and keeps ARIA state synchronized", async ({ page }) => {
  const indicators = page.locator(".slider__indicator");

  for (const index of [1, 2, 0]) {
    await indicators.nth(index).click();
    await expectActiveSlide(page, index);
  }
});

test("slide changes use a CSS transition and reach the requested transform", async ({ page }) => {
  const list = page.locator(".slider__list");
  const transition = await list.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      property: styles.transitionProperty,
      duration: Number.parseFloat(styles.transitionDuration) * 1000,
    };
  });

  expect(transition.property).toContain("transform");
  expect(transition.duration).toBeGreaterThan(0);

  await page.locator(".slider__control--next").click();
  await expect(list).toHaveCSS("transform", /matrix/);
  await expectSettledTransform(page, 1);
});

test("active slide survives resize at all control widths", async ({ page }) => {
  await page.locator(".slider__indicator").nth(1).click();
  await expectActiveSlide(page, 1);

  for (const viewport of [
    { width: 768, height: 900 },
    { width: 380, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expectActiveSlide(page, 1);
    await expectSettledTransform(page, 1);
  }
});
