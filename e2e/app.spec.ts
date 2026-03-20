import { test, expect } from "@playwright/test";

test.describe("Bonus Scan Flow", () => {
  test("carrega a página inicial", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Bonus Scan Flow/);
  });
});
