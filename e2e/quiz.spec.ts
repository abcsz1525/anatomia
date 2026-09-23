import { expect, test, type Locator, type Page } from "@playwright/test";

const TOPIC_RU = "Кости нижней конечности";
const TOPIC_ID = "lower-limb-bones";

async function gotoQuizReady(page: Page) {
  await page.goto("/quiz");
  await expect(page.locator("[data-atlas-ready='true']")).toBeVisible({ timeout: 90_000 });
}

async function selectTopicAndMode(page: Page, modeRu: string) {
  // The label text includes the concept-count badge, so match by substring
  // (getByLabel's default) rather than the full accessible name.
  await page.getByLabel(TOPIC_RU).check();
  await page.getByLabel(modeRu).check();
}

/**
 * In "find" mode the initial camera framing fits the *whole* body (the
 * reset framing in CameraRig ignores `restrictTo`), so the restricted
 * topic can end up as a small silhouette off-centre in the canvas — a
 * fixed click position is not reliable. Instead we screenshot the canvas,
 * decode it back inside the page (a plain 2D canvas, unlike the WebGL one,
 * always supports getImageData), and pick pixels that differ from the
 * background colour, i.e. points that are actually on the model. Any
 * visible part belongs to the restricted topic in this mode, so a handful
 * of such points spread across the model's vertical extent is enough to
 * land 3 real attempts regardless of which structure the question asks for.
 */
async function findModelClickPoints(
  canvas: Locator,
  page: Page,
  box: { width: number; height: number },
  count: number,
): Promise<{ x: number; y: number }[]> {
  const buffer = await canvas.screenshot({ scale: "css" });
  const base64 = buffer.toString("base64");
  return page.evaluate(
    ({ base64, width, height, count }) => {
      const img = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("could not decode canvas screenshot"));
      });
      img.src = `data:image/png;base64,${base64}`;
      return loaded.then(() => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, width, height).data;
        // background is sampled from the top-left corner, which is never
        // part of the model at the default (whole-body) framing
        const bgR = data[0]!;
        const bgG = data[1]!;
        const bgB = data[2]!;
        const isForeground = (x: number, y: number) => {
          const i = (y * width + x) * 4;
          const dr = data[i]! - bgR;
          const dg = data[i + 1]! - bgG;
          const db = data[i + 2]! - bgB;
          return dr * dr + dg * dg + db * db > 400;
        };
        let minY = height;
        let maxY = -1;
        const step = 2;
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            if (isForeground(x, y)) {
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxY < 0) return [];
        const points: { x: number; y: number }[] = [];
        for (let k = 0; k < count; k++) {
          const frac = (k + 1) / (count + 1);
          const y = Math.round(minY + (maxY - minY) * frac);
          // widen the scan by a couple of rows so a thin bone at this
          // exact y isn't missed by anti-aliasing
          let bestStart = -1;
          let bestLen = 0;
          let curStart = -1;
          let curLen = 0;
          for (let x = 0; x < width; x++) {
            const fg =
              isForeground(x, y) ||
              isForeground(x, Math.min(height - 1, y + 1)) ||
              isForeground(x, Math.max(0, y - 1));
            if (fg) {
              if (curStart < 0) curStart = x;
              curLen++;
              if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
              }
            } else {
              curStart = -1;
              curLen = 0;
            }
          }
          if (bestLen > 0) points.push({ x: bestStart + bestLen / 2, y });
        }
        return points;
      });
    },
    { base64, width: box.width, height: box.height, count },
  );
}

test("name mode session completes and records progress", async ({ page }) => {
  await gotoQuizReady(page);
  await selectTopicAndMode(page, "Назови структуру");
  await page.getByTestId("quiz-start").click();

  await expect(page.getByTestId("quiz-counter")).toHaveText("Вопрос 1 из 10");

  for (let i = 0; i < 10; i++) {
    await page.getByTestId("quiz-option").first().click();
    const next = page.getByTestId("quiz-next");
    await expect(next).toBeVisible();
    await next.click();
  }

  await expect(page.getByTestId("quiz-result")).toHaveText(/Верно \d+ из 10/);

  await page.goto("/progress");
  await expect(page.getByTestId("progress-screen")).toBeVisible();
  const row = page.locator(`[data-testid="progress-topic"][data-topic="${TOPIC_ID}"]`);
  await expect(row).toHaveText(/1 сесси/);
});

test("find mode gives feedback and reaches the next question", async ({ page }) => {
  await gotoQuizReady(page);
  await selectTopicAndMode(page, "Найди структуру");
  await page.getByTestId("quiz-start").click();

  await expect(page.getByTestId("quiz-counter")).toHaveText("Вопрос 1 из 10");

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  const feedback = page.getByTestId("quiz-feedback");
  const next = page.getByTestId("quiz-next");

  const points = await findModelClickPoints(canvas, page, box, 6);
  expect(points.length).toBeGreaterThan(0);

  // Three attempts is the quiz's own limit before it reveals the answer;
  // click through the sampled points (each on a different part of the
  // model, so repeats on an already-rejected structure are unlikely)
  // until either a click lands correctly or the answer gets revealed.
  for (const point of points) {
    if (await next.isVisible()) break;
    const before = (await feedback.textContent()) ?? "";
    await canvas.click({ position: point });
    try {
      await expect(feedback).not.toHaveText(before, { timeout: 2_000 });
    } catch {
      // this point didn't register (e.g. re-hit an already-rejected part
      // or the background); move on to the next sampled point
    }
  }

  await expect(next).toBeVisible();
  await expect(feedback).toHaveText(/Верно|Правильный ответ показан/);
});

test("abort returns to setup", async ({ page }) => {
  await gotoQuizReady(page);
  await page.getByLabel(TOPIC_RU).check();
  await page.getByTestId("quiz-start").click();

  await expect(page.getByTestId("quiz-runner")).toBeVisible();
  await page.getByRole("button", { name: "Прервать" }).click();
  await expect(page.getByTestId("quiz-setup")).toBeVisible();
});

test("progress export produces a file", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByTestId("progress-screen")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("progress-export").click(),
  ]);

  expect(download.suggestedFilename()).toBe("anatomia-progress.json");
});
