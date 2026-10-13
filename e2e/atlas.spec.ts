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

  // Правый нижний угол под доком — фон при кадре по умолчанию: слева внизу
  // панель систем, справа по центру ракурсы, внизу по центру док.
  await canvas.click({ position: { x: box.width - 30, y: box.height - 30 } });
  await expect(page.getByTestId("part-card")).not.toBeVisible();
});

test("search focuses a structure and shows its card", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
  await page.getByTestId("search-toggle").click();
  await page.getByLabel("Поиск структуры").fill("femur");
  await page.getByRole("listbox").getByRole("button").first().click();
  await expect(page.getByTestId("part-en")).toContainText(/femur/i);
});

test("search in russian shows latin name", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
  // "бедренная" alone now also matches the femoral artery/vein/nerve (all
  // systems are translated), so search the full bone name to keep this a
  // deterministic single match.
  await page.getByTestId("search-toggle").click();
  await page.getByLabel("Поиск структуры").fill("бедренная кость");
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
  await page.getByTestId("search-toggle").click();
  await page.getByLabel("Поиск структуры").fill("aorta");
  await page.getByRole("listbox").getByRole("button").first().click();

  await expect(page.getByTestId("part-en")).toContainText(/aorta/i);
  await expect(page.getByLabel("Артерии")).toBeChecked();
});

test("the part card reads the latin name in russian", async ({ page }) => {
  // FJ3259 — левая бедренная кость: у двусложного femur ударение на первом
  // слоге при любом раскладе, поэтому проверка не зависит от вычитки словаря
  await page.goto("/atlas?focus=FJ3259");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await expect(page.getByTestId("part-la")).toHaveText("Femur");
  const laRu = page.getByTestId("part-la-ru");
  // ударение — комбинирующий акут после гласной, рамка — квадратные скобки
  await expect(laRu).toContainText("фэ́мур");
  await expect(laRu).toHaveText(/^\[.+\]$/);
});

test("about page lists BodyParts3D attribution", async ({ page }) => {
  await page.goto("/about");
  // "BodyParts3D" appears twice (the dataset link and the citation text),
  // so scope to the first match rather than requiring a unique locator.
  await expect(page.getByText("BodyParts3D").first()).toBeVisible();
  await expect(page.getByText("CC BY 4.0")).toBeVisible();
});

test("тумблер системы включает слой и меняет число видимых структур", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const count = page.getByTestId("visible-count");
  const read = async () => Number((await count.textContent())?.replace(/\D/g, ""));
  const before = await read();

  const arteries = page.getByLabel("Артерии");
  await expect(arteries).not.toBeChecked();
  await arteries.click();
  await expect(arteries).toBeChecked();
  await expect.poll(read).toBeGreaterThan(before);
});

test("чип «Скелет» оставляет один включённый тумблер", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: "Скелет", exact: true }).click();
  await expect(page.getByRole("button", { name: "Скелет", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { checked: true })).toHaveCount(1);
  await expect(page.getByLabel("Кости")).toBeChecked();
});

test("ползунок разносит модель: подпись «Инвентарь», ракурс только спереди", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.locator("#explode-slider").fill("100");
  await expect(page.getByTestId("explode-value")).toHaveText("100%");
  await expect(page.getByTestId("scene-caption")).toHaveText(/инвентарь/i);
  await expect(page.getByRole("button", { name: "Спереди" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Сбоку" })).toBeDisabled();

  // сброс собирает модель
  await page.getByRole("button", { name: "Собрать модель и сбросить вид" }).click();
  await expect(page.getByTestId("explode-value")).toHaveText("0%");
  await expect(page.getByRole("button", { name: "Сбоку" })).toBeEnabled();
});

test("кнопка ракурса подсвечивается", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.getByRole("button", { name: "Сбоку" }).click();
  await expect(page.getByRole("button", { name: "Сбоку" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Три четверти" })).toHaveAttribute("aria-pressed", "false");
});

test("клавиша «/» открывает поиск, ссылка на источник ведёт на /about", async ({ page }) => {
  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.keyboard.press("/");
  await expect(page.getByLabel("Поиск структуры")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("search-panel")).toBeHidden();

  await expect(page.getByTestId("source-link")).toHaveAttribute("href", "/about");
});

test("карточка понятия из нескольких мешей показывает входящие структуры", async ({ page }) => {
  // у FJ3259 (бедренная кость) соседей по понятию нет: правая — отдельное
  // понятие FMA. FJ1313 — левый зрительный нерв, его понятие собрано из двух
  // мешей (FJ1313 и FJ1772), оба «Nervus opticus»
  await page.goto("/atlas?focus=FJ1313");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const siblings = page.getByTestId("part-siblings");
  await expect(siblings).toBeVisible();
  await siblings.getByRole("button").first().click();
  await expect(page.getByTestId("part-card")).toHaveAttribute("data-part-id", "FJ1772");
  await expect(page.getByTestId("part-la")).toHaveText("Nervus opticus");
});
