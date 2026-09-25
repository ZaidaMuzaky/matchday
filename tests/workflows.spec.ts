import { test, expect } from "@playwright/test";

test("sample workspace, scoring, correction, persistence, and snapshot", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Northside Cup", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 of 7 played")).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  await page
    .locator(".next-match")
    .getByRole("button", { name: "Record score" })
    .click();
  const inputs = page.getByRole("dialog").getByRole("spinbutton");
  await inputs.nth(0).fill("2");
  await inputs.nth(1).fill("2");
  await page.getByRole("button", { name: "Save result" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot be tied");
  await inputs.nth(1).fill("0");
  await page.getByRole("button", { name: "Save result" }).click();
  await expect(page.getByText("5 of 7 played")).toBeVisible();
  await page.reload();
  await expect(page.getByText("5 of 7 played")).toBeVisible();
  await page
    .getByRole("button", { name: "Share tournament", exact: true })
    .click();
  const url = await page.getByLabel("Snapshot link").inputValue();
  const spectator = await context.newPage();
  await spectator.goto(url);
  await expect(spectator.getByText("5 of 7 played")).toBeVisible();
  await expect(
    spectator.getByText("You’re viewing a read-only snapshot.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    spectator.locator(".next-match").getByRole("button"),
  ).toHaveCount(0);
  await spectator.close();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", {
      name: "Edit score: Northside FC versus Parkside Athletic",
      exact: true,
    })
    .click();
  await page.getByRole("dialog").getByRole("spinbutton").nth(0).fill("0");
  await page.getByRole("dialog").getByRole("spinbutton").nth(1).fill("4");
  await page.getByRole("button", { name: "Save result" }).click();
  await expect(page.getByText("4 of 7 played")).toBeVisible();
  expect(errors).toEqual([]);
});

test("create, validate, reseed, generate odd bracket, crown champion, export and import", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create tournament", exact: true })
    .click();
  await page.getByLabel("Tournament name", { exact: true }).fill("City Cup");
  await page.getByLabel("Tournament date").fill("2026-10-10");
  await page
    .getByLabel("Team names", { exact: true })
    .fill("Alpha\nAlpha\nCharlie");
  await page
    .locator("form")
    .getByRole("button", { name: "Create tournament", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("unique");
  await page
    .getByLabel("Team names", { exact: true })
    .fill("Alpha\nBravo\nCharlie");
  await page
    .locator("form")
    .getByRole("button", { name: "Create tournament", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "City Cup", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Participants", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Move Bravo up", exact: true })
    .click();
  await expect(page.locator(".participant-row").first()).toContainText("Bravo");
  await page.getByRole("button", { name: "Bracket", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate bracket", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lock seeds & start", exact: true })
    .click();
  await expect(page.getByText("Bye · auto-advanced")).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page
      .locator(".next-match")
      .getByRole("button", { name: "Record score" })
      .click();
    await page.getByRole("dialog").getByRole("spinbutton").nth(0).fill("3");
    await page.getByRole("dialog").getByRole("spinbutton").nth(1).fill("1");
    await page.getByRole("button", { name: "Save result" }).click();
  }
  await expect(page.locator(".winner-banner")).toContainText(
    "Congratulations, Bravo.",
  );
  await page.reload();
  await page.getByRole("button", { name: "City Cup", exact: true }).click();
  await expect(page.locator(".winner-banner")).toContainText("Bravo");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page
    .getByRole("button", { name: "All tournaments", exact: true })
    .click();
  await page.getByLabel("Import tournament file").setInputFiles(path!);
  await expect(
    page.getByRole("heading", { name: "City Cup (copy)", exact: true }),
  ).toBeVisible();
});

test("mobile layout, search empty state, guide and keyboard dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Northside Cup", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByText(
      "Scroll sideways to see every round, or switch to the match list.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to match list" }).click();
  await expect(
    page.getByRole("heading", { name: "Match center" }),
  ).toBeVisible();
  await page.getByLabel("Filter matches").selectOption("ready");
  await expect(page.locator(".match-list-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Record score", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByRole("spinbutton").first(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "All tournaments", exact: true })
    .click();
  await page.getByLabel("Search tournaments").fill("none-match");
  await expect(page.getByText("No tournaments found")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".tournament-list-item")).toHaveCount(3);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(
    page.getByRole("heading", { name: "A good tournament starts here." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("corrupt storage and invalid shared snapshots recover visibly", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("matchday.tournaments.v1", "{invalid"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  expect(
    await page.evaluate(() => localStorage.getItem("matchday.tournaments.v1")),
  ).toBe("{invalid");
  await page.goto("/#view=invalid");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "This link couldn’t be opened" }),
  ).toBeVisible();
});

test("unavailable storage retains the current result and explains backup recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page
    .locator(".next-match")
    .getByRole("button", { name: "Record score" })
    .click();
  await page.getByRole("dialog").getByRole("spinbutton").nth(0).fill("2");
  await page.getByRole("dialog").getByRole("spinbutton").nth(1).fill("0");
  await page.getByRole("button", { name: "Save result" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "could not save this change",
  );
  await expect(page.getByText("5 of 7 played")).toBeVisible();
  await expect(page.getByText("Saving needs attention")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("northside-cup.json");
});
