import { test, expect } from "@playwright/test";
import { fantasyApi } from "./fixtures/fantasy-api";

const routes = [
  "/login",
  "/register",
  "/",
  "/players",
  "/players/p1",
  "/team",
  "/team/history",
  "/team/history/r0",
  "/team/t2",
  "/leaderboard",
  "/403",
  "/admin",
  "/admin/players",
  "/admin/seasons",
  "/admin/rounds",
  "/admin/performances",
];
const viewports = [
  [320, 812],
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1280, 900],
  [1440, 900],
  [667, 375],
  [844, 390],
];
for (const [width, height] of viewports)
  test(`route review ${width}x${height}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height });
    const state = await fantasyApi(page, { edge: true });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of routes) {
      state.role = ["/login", "/register"].includes(route) ? null : "ADMIN";
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForTimeout(150);
      await expect(
        page.getByText("Unable to load", { exact: false }),
      ).toHaveCount(0);
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width && (r.right > innerWidth + 1 || r.left < -1);
          })
          .slice(0, 8)
          .map(
            (el) =>
              `${el.tagName}.${el.className}: ${el.textContent?.slice(0, 70)}`,
          ),
      }));
      expect
        .soft(
          overflow.scroll,
          `${route} ${width}: ${JSON.stringify(overflow.elements)}`,
        )
        .toBeLessThanOrEqual(width);
      if ([375, 390, 768, 1440].includes(width))
        await page.screenshot({
          path: info.outputPath(`${route.replaceAll("/", "_") || "home"}.png`),
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
