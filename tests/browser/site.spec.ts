import { expect, test } from "@playwright/test";

test("mobile menu supports keyboard focus, Escape, page changes and history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  const mobile = page.getByRole("navigation", { name: "Mobile", exact: true });
  await expect(
    mobile.getByRole("link", { name: "Home", exact: true }),
  ).toBeFocused();
  await expect(page.locator("main")).toHaveJSProperty("inert", true);
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".drawer > a")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(page.locator("main")).toHaveJSProperty("inert", false);
  await toggle.click();
  await mobile.getByRole("link", { name: "Careers", exact: true }).click();
  await expect(page).toHaveURL(/\/careers$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await toggle.click();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("legacy fragments open their dedicated pages and visible timeline", async ({
  page,
}) => {
  await page.goto("/#journey");
  await expect(page).toHaveURL(/\/club#journey$/);
  await expect(page).toHaveTitle("Club | NUSC");
  await expect
    .poll(async () =>
      page
        .locator("#journey")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeGreaterThanOrEqual(82);
  await expect
    .poll(async () =>
      page
        .locator("#journey")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeLessThan(150);
  await page.goto("/#careers");
  await expect(page).toHaveURL(/\/careers$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Join the team.",
  );
});

test("store landing carousel advances and stays in the store app", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("http://127.0.0.1:3103/");
  await expect(page).toHaveTitle("Shop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Now is the time",
  );
  await page.getByRole("button", { name: "Show Away colors slide" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Away colors",
  );
  await page.screenshot({ path: info.outputPath("store-desktop.png") });
});

test("reduced motion stops movement and content remains available without JavaScript", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".marquee-track")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".preview").last()).toHaveCSS("opacity", "1");
  await expect(page.locator(".preview").last()).toHaveCSS("transform", "none");
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.goto("http://127.0.0.1:3102/pathway");
    await expect(staticPage.locator(".pcard")).toHaveCount(9);
    await expect(staticPage.locator(".pcard").last()).toHaveCSS("opacity", "1");
  } finally {
    await context.close();
  }
});

test("every page fits phone, tablet and desktop widths without content overflow", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/",
    "/club",
    "/honours",
    "/pathway",
    "/community",
    "/partners",
    "/careers",
    "/contact",
  ];
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 768 });
    for (const route of routes) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return [...document.querySelectorAll("body *")]
          .filter((el) => {
            if (
              !el.getClientRects().length ||
              el.closest(
                ".burst,.hero-crest,.hero-grid,.marquee,.drawer,.champ-word,.iis-word",
              )
            )
              return false;
            const rect = el.getBoundingClientRect();
            return rect.right > width + 1 || rect.left < -1;
          })
          .map((el) => `${el.tagName}.${el.className}`);
      });
      expect(overflow, `${width}px ${route}`).toEqual([]);
      if (route === "/" && width === 1366) {
        expect(
          await page
            .locator(".hero-actions")
            .evaluate((el) => el.getBoundingClientRect().bottom),
        ).toBeLessThanOrEqual(768);
        await page.screenshot({ path: info.outputPath("home-desktop.png") });
      }
      if (route === "/careers" && width === 390)
        await page.screenshot({ path: info.outputPath("careers-mobile.png") });
      if (route === "/pathway" && width === 1366) {
        await page.locator(".players").scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath("players-desktop.png") });
      }
    }
    await page.goto("http://127.0.0.1:3103/");
    await page.evaluate(() => document.fonts.ready);
    const storeOverflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return [...document.querySelectorAll("body *")]
        .filter((el) => {
          if (
            !el.getClientRects().length ||
            el.closest(
              ".burst,.hero-crest,.hero-grid,.marquee,.drawer,.champ-word,.iis-word",
            )
          )
            return false;
          const rect = el.getBoundingClientRect();
          return rect.right > width + 1 || rect.left < -1;
        })
        .map((el) => `${el.tagName}.${el.className}`);
    });
    expect(storeOverflow, `${width}px store /`).toEqual([]);
    if (width === 390)
      await page.screenshot({ path: info.outputPath("store-mobile.png") });
  }
  expect(errors).toEqual([]);
});
