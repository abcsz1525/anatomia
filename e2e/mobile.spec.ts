import { expect, test, type Locator } from "@playwright/test";

/**
 * Мобильная раскладка (проект `mobile` в playwright.config.ts: 390×844,
 * `hasTouch`, `isMobile`). Здесь проверяется именно то, чего нет на десктопе:
 * шторки вместо панелей, панель теста под моделью, крупные цели касания и
 * отсутствие горизонтального скролла страницы.
 *
 * Кнопки, по которым тест стучит, намеренно живут справа: в dev-режиме левый
 * нижний угол занимает индикатор Next.js и перехватывает касания.
 *
 * localStorage у каждого теста свой: Playwright даёт тесту отдельный контекст
 * браузера, поэтому прогресс и настройки между тестами не протекают.
 */

const TOPIC_RU = "Кости нижней конечности";
const TOPIC_ID = "lower-limb-bones";
/** Левая бедренная кость: переведена и лежит в теме с карточками. */
const FEMUR_PART_ID = "FJ3259";

/** Высота элемента прямо сейчас; 0, если его не видно. */
async function heightOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  return box?.height ?? 0;
}

test("атлас: слои и карточка структуры открываются шторками", async ({ page }) => {
  // тест грузит атлас дважды (обычный и по ?focus=), поэтому бюджет времени тройной
  test.slow();

  await page.goto("/atlas");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  // боковой панели телефону не достаётся: вместо неё кнопка «Слои» внизу справа
  await expect(page.getByTestId("layers-toggle")).toBeVisible();
  await expect(page.locator('aside[aria-label="Слои"]')).toBeHidden();

  await page.getByTestId("layers-toggle").click();
  const layers = page.getByTestId("layers-sheet");
  await expect(layers).toBeVisible();

  // галочки в шторке работают так же, как в десктопной панели
  const muscles = layers.getByLabel("Мышцы");
  await expect(muscles).toBeChecked();
  await muscles.uncheck();
  await expect(muscles).not.toBeChecked();

  // крестик в шторке (справа сверху) закрывает её, модель остаётся на экране
  await layers.getByRole("button", { name: "Закрыть" }).click();
  await expect(layers).toBeHidden();
  await expect(page.locator("canvas")).toBeVisible();

  // ?focus= выделяет структуру, как клик по ней: на телефоне её карточка
  // приезжает шторкой снизу, а не плавающим прямоугольником справа
  await page.goto(`/atlas?focus=${FEMUR_PART_ID}`);
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  const partSheet = page.getByTestId("part-sheet");
  await expect(partSheet).toBeVisible();
  await expect(partSheet.getByTestId("part-la")).toHaveText("Femur");
  await expect(partSheet.getByRole("link", { name: "Учить карточки темы" })).toBeVisible();
});

test("тесты: панель стоит под моделью и сворачивается", async ({ page }) => {
  await page.goto("/quiz");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  await page.getByLabel(TOPIC_RU).check();
  await page.getByLabel("Найди структуру").check();
  await page.getByTestId("quiz-start").click();
  await expect(page.getByTestId("quiz-runner")).toBeVisible();

  const panel = page.locator('aside[aria-label="Тест"]');
  const canvas = page.locator("canvas");

  // раскладка колонкой: модель сверху, панель целиком под ней (на десктопе
  // панель стоит слева, то есть её верх совпадает с верхом канваса)
  const gapBelowCanvas = async () => {
    const p = await panel.boundingBox();
    const c = await canvas.boundingBox();
    if (!p || !c) return null;
    return p.y - (c.y + c.height);
  };
  // допуск в пиксель: дробная высота dvh округляется по-разному у соседних боксов
  await expect.poll(gapBelowCanvas).toBeGreaterThanOrEqual(-1);
  await expect.poll(gapBelowCanvas).toBeLessThanOrEqual(1);

  // свёрнутая панель освобождает модель, оставляя строку с вопросом
  const expanded = await heightOf(panel);
  expect(expanded).toBeGreaterThan(0);
  const toggle = page.getByTestId("quiz-panel-toggle");
  await expect(toggle).toHaveText("Свернуть");

  await toggle.click();
  await expect(toggle).toHaveText("Развернуть");
  await expect.poll(() => heightOf(panel)).toBeLessThan(expanded);
  // вопрос виден и в свёрнутом виде — иначе искать на модели нечего
  await expect(page.getByTestId("quiz-prompt")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveText("Свернуть");
  // та же высота, что и до сворачивания (дробный dvh — отсюда допуск)
  await expect.poll(() => heightOf(panel)).toBeCloseTo(expanded, 0);
});

test("карточки: сессия проходится касаниями", async ({ page }) => {
  const NEW_LIMIT = 3;
  await page.goto(`/cards?topic=${TOPIC_ID}`);
  await expect(page.getByTestId("cards-setup")).toBeVisible();

  await page.getByTestId("cards-new-limit").fill(String(NEW_LIMIT));
  // чистый прогресс: к повторению ничего, новых — ровно лимит
  await expect(page.getByTestId("cards-today")).toHaveText(
    `Сегодня: 0 к повторению, ${NEW_LIMIT} новых`,
  );
  await page.getByTestId("cards-start").click();

  for (let i = 0; i < NEW_LIMIT; i++) {
    await expect(page.getByTestId("cards-counter")).toHaveText(`Осталось ${NEW_LIMIT - i}`);
    // «Помню» — средняя кнопка ряда оценок: цель касания ≥ 44 px
    const grade = page.getByTestId("card-grade-good");
    await expect(grade).toBeHidden();
    await page.getByTestId("card-show").click();
    await expect(page.getByTestId("card-back")).toBeVisible();
    expect(await heightOf(grade)).toBeGreaterThanOrEqual(44);
    await grade.click();
  }

  await expect(page.getByTestId("cards-done")).toContainText(`Повторено ${NEW_LIMIT}`);
});

test("прогресс: таблица прокручивается сама, а страница — нет", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByTestId("progress-screen")).toBeVisible();

  // широкая таблица живёт в собственном контейнере с горизонтальным скроллом
  const table = page.getByTestId("progress-table");
  await expect(table).toBeVisible();
  const scroller = table.locator("xpath=..");
  await expect(scroller).toHaveClass(/overflow-x-auto/);
  expect(await heightOf(table)).toBeGreaterThan(0);

  // …поэтому саму страницу вбок не растягивает
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(0);

  // шапка на узком экране сокращает самую длинную подпись
  const nav = page.getByTestId("site-nav");
  await expect(nav.getByText("Источники", { exact: true })).toBeVisible();
  await expect(nav.getByText("Об источниках", { exact: true })).toBeHidden();
});
