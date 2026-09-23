import { expect, test } from "@playwright/test";

test("atlas loads the model and a click selects a structure", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  // центр модели: грудная клетка/грудина при фронтальной камере
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

  const card = page.getByTestId("part-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("part-en")).not.toHaveText("");
  // какая именно структура окажется под центром канваса — зависит от кадра,
  // поэтому проверяем форму подписи: перевод (при парном органе со стороной)
  // либо явную заглушку «Перевод в работе», но не пустую строку.
  await expect(page.getByTestId("part-ru")).toHaveText(/(\((слева|справа)\)|Перевод в работе|[А-Яа-яё]{3,})/);
});

test("clicking empty space deselects", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");

  // First select something via the canvas-center click (mirrors test 1).
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.getByTestId("part-card")).toBeVisible();

  // Bottom-left corner of the canvas is background at the default framing;
  // top-left overlaps the search box overlay (aria-label "Поиск структуры"),
  // which intercepts pointer events, so we click low instead.
  await canvas.click({ position: { x: 40, y: box.height - 40 } });
  await expect(page.getByTestId("part-card")).not.toBeVisible();
});

test("search focuses a structure and shows its card", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
  await page.getByLabel("Поиск структуры").fill("femur");
  await page.getByRole("listbox").getByRole("button").first().click();
  await expect(page.getByTestId("part-en")).toContainText(/femur/i);
});

test("search in russian shows latin name", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
  await page.getByLabel("Поиск структуры").fill("бедренная");
  await page.getByRole("listbox").getByRole("button").first().click();
  await expect(page.getByTestId("part-la")).toHaveText("Femur");
  await expect(page.getByTestId("part-ru")).toContainText("Бедренная кость");
  // femur entries carry a side, so the card must also show «слева»/«справа».
  await expect(page.getByTestId("part-ru")).toContainText(/\((слева|справа)\)/);
});

test("search reveals a hidden system", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  // "Артерии" is off by default, so picking an aorta hit must turn the system on.
  await expect(page.getByLabel("Артерии")).not.toBeChecked();
  await page.getByLabel("Поиск структуры").fill("aorta");
  await page.getByRole("listbox").getByRole("button").first().click();

  await expect(page.getByTestId("part-en")).toContainText(/aorta/i);
  await expect(page.getByLabel("Артерии")).toBeChecked();
});

test("about page lists BodyParts3D attribution", async ({ page }) => {
  await page.goto("/about");
  // "BodyParts3D" appears twice (the dataset link and the citation text),
  // so scope to the first match rather than requiring a unique locator.
  await expect(page.getByText("BodyParts3D").first()).toBeVisible();
  await expect(page.getByText("CC BY 4.0")).toBeVisible();
});
