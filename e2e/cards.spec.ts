import { expect, test, type Page } from "@playwright/test";

const TOPIC_RU = "Кости нижней конечности";
const TOPIC_ID = "lower-limb-bones";
/** Левая бедренная кость: часть этой темы, переведённая (карточки по ней есть). */
const FEMUR_PART_ID = "FJ3259";
/** Столько новых карточек берём в сессию — меньше колоды темы (33 концепта). */
const NEW_LIMIT = 5;

/**
 * Экран карточек рисует настройку только после загрузки content + manifest
 * (геометрия ему не нужна), поэтому ждать нечего, кроме самой настройки.
 *
 * localStorage каждый тест получает пустым: Playwright даёт тесту свой
 * контекст браузера, поэтому ни прогресс (`anatomia.progress.v1`), ни
 * «Новых в день» (`anatomia.cards.newLimit`) между тестами не протекают —
 * та же опора, что у quiz.spec.ts на «1 сессия» в прогрессе.
 */
async function gotoCardsSetup(page: Page, query = "") {
  await page.goto(`/cards${query}`);
  await expect(page.getByTestId("cards-setup")).toBeVisible();
}

test("a topic session grades its new cards and shows up in progress", async ({ page }) => {
  await gotoCardsSetup(page, `?topic=${TOPIC_ID}`);
  await page.getByTestId("cards-new-limit").fill(String(NEW_LIMIT));
  // чистый прогресс: к повторению ничего, новых — ровно лимит
  await expect(page.getByTestId("cards-today")).toHaveText(
    `Сегодня: 0 к повторению, ${NEW_LIMIT} новых`,
  );
  await page.getByTestId("cards-start").click();

  // направление по умолчанию — «Латынь → Русский», поэтому уже на лице первой
  // карточки под латынью стоит её русское чтение в квадратных скобках
  await expect(page.getByTestId("card-la-ru")).toHaveText(/^\[.+\]$/);

  for (let i = 0; i < NEW_LIMIT; i++) {
    await expect(page.getByTestId("cards-counter")).toHaveText(`Осталось ${NEW_LIMIT - i}`);
    await expect(page.getByTestId("card-front")).not.toHaveText("");
    // оборот открывается только по «Показать» — оценивать раньше нечего
    await expect(page.getByTestId("card-back")).toBeHidden();
    await page.getByTestId("card-show").click();
    await expect(page.getByTestId("card-back")).toBeVisible();
    await page.getByTestId("card-grade-good").click();
  }

  await expect(page.getByTestId("cards-done")).toContainText(`Повторено ${NEW_LIMIT}`);

  await page.goto("/progress");
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  const row = page.locator(`[data-testid="progress-topic"][data-topic="${TOPIC_ID}"]`);
  // первый «Помню» даёт интервал в 1 день, до «выучено» (≥ 7) ещё далеко
  await expect(row.getByTestId("topic-cards")).toContainText("выучено 0 из");
  await expect(page.getByTestId("progress-reviews-today")).toHaveText("Повторений сегодня: 1");

  // дневная норма новых израсходована: вторая сессия того же дня новых не даёт,
  // хотя в теме остались непоказанные карточки
  await gotoCardsSetup(page, `?topic=${TOPIC_ID}`);
  await page.getByTestId("cards-new-limit").fill(String(NEW_LIMIT));
  await expect(page.getByTestId("cards-today")).toHaveText("Сегодня: 0 к повторению, 0 новых");
  await expect(page.getByTestId("cards-new-today")).toHaveText(
    `(сегодня уже показано ${NEW_LIMIT} новых)`,
  );
  await expect(page.getByTestId("cards-start")).toBeDisabled();
  // тупика нет: экран говорит, когда карточки вернутся («Помню» → завтра)
  await expect(page.getByTestId("cards-setup-next-due")).toHaveText(
    /^Следующее повторение: \d{2}\.\d{2}\.\d{4}$/,
  );
});

test("the all-topics setup shows today's counters", async ({ page }) => {
  await gotoCardsSetup(page);

  await expect(page.getByLabel("Все темы")).toBeChecked();
  await expect(page.getByTestId("cards-direction-la-ru")).toBeChecked();
  await expect(page.getByTestId("cards-today")).toHaveText(
    /Сегодня: \d+ к повторению, \d+ новых/,
  );
  await expect(page.getByTestId("cards-start")).toBeEnabled();
});

test("?topic= preselects the topic of the link", async ({ page }) => {
  await gotoCardsSetup(page, `?topic=${TOPIC_ID}`);

  // подпись темы несёт ещё и число понятий, поэтому совпадение по подстроке
  await expect(page.getByLabel(TOPIC_RU)).toBeChecked();
  await expect(page.getByLabel("Все темы")).not.toBeChecked();
});

test("the atlas part card opens the cards of its topic", async ({ page }) => {
  await page.goto(`/atlas?focus=${FEMUR_PART_ID}`);
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });

  // ?focus= выделяет структуру, как клик по ней, и открывает её карточку
  await expect(page.getByTestId("part-card")).toBeVisible();
  await expect(page.getByTestId("part-la")).toHaveText("Femur");

  await page.getByTestId("part-cards-link").click();
  await expect(page).toHaveURL(new RegExp(`/cards\\?topic=${TOPIC_ID}$`));
  await expect(page.getByTestId("cards-setup")).toBeVisible();
  await expect(page.getByLabel(TOPIC_RU)).toBeChecked();
});
