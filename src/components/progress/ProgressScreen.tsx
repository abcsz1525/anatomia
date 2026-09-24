"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadManifest } from "@/lib/atlas/load-atlas";
import type { AtlasManifest } from "@/lib/atlas/types";
import { loadContent } from "@/lib/content/load-content";
import type { ContentBundle } from "@/lib/content/types";
import { daysLabel, sessionsLabel } from "@/lib/progress/format";
import { emptyProgress, normalizeActiveDays } from "@/lib/progress/record";
import { parseProgressDetailed, stringifyProgress } from "@/lib/progress/serialize";
import { cardMastery, dayKey, streakDays, topicMastery } from "@/lib/progress/stats";
import { clearBackup, hasBackup, loadProgress, saveProgress } from "@/lib/progress/storage";
import type { ProgressV1 } from "@/lib/progress/types";
import { topicGroups, topicParts } from "@/lib/quiz/pool";
import { topicDeck } from "@/lib/srs/deck";

const EXPORT_FILENAME = "anatomia-progress.json";

interface TopicRow {
  id: string;
  ru: string;
  known: number;
  total: number;
  /** Карточки темы с интервалом ≥ 7 дней и размер колоды. */
  learned: number;
  cards: number;
  sessions: number;
}

/** Группа тем экрана прогресса: тот же список, что в квизе и карточках, со строками вместо вариантов. */
interface ProgressGroup {
  id: string;
  ru: string;
  rows: TopicRow[];
}

/** Экрану нужны только названия и список частей — геометрия (чанки) не грузится. */
type DataState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; content: ContentBundle; manifest: AtlasManifest };

export function ProgressScreen() {
  const [data, setData] = useState<DataState>({ status: "loading" });
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [backupNotice, setBackupNotice] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [content, manifest] = await Promise.all([
          loadContent("", { signal: controller.signal }),
          loadManifest("", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setData({ status: "ready", content, manifest });
      } catch {
        if (controller.signal.aborted) return;
        setData({ status: "error" });
      }
    })();
    return () => controller.abort();
  }, []);

  // localStorage есть только в браузере: читаем после монтирования, иначе
  // серверная разметка разошлась бы с первым клиентским рендером
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable until mount
    setProgress(loadProgress());
    setBackupNotice(hasBackup());
  }, []);

  const groups = useMemo<ProgressGroup[]>(() => {
    if (data.status !== "ready") return [];
    const { content, manifest } = data;
    const p = progress ?? emptyProgress();
    const sessionsByTopic = new Map<string, number>();
    for (const s of p.sessions) sessionsByTopic.set(s.topicId, (sessionsByTopic.get(s.topicId) ?? 0) + 1);

    return topicGroups(content, manifest).map((group) => ({
      id: group.id,
      ru: group.ru,
      rows: group.topics.map((topic) => {
        const { known, total } = topicMastery(p, topicParts(content, manifest, topic.id));
        const cards = cardMastery(p, topicDeck(content, manifest, topic.id));
        return {
          id: topic.id,
          ru: topic.ru,
          known,
          total,
          learned: cards.learned,
          cards: cards.total,
          sessions: sessionsByTopic.get(topic.id) ?? 0,
        };
      }),
    }));
  }, [data, progress]);

  const streak = useMemo(
    () => streakDays(progress?.activeDays ?? [], dayKey(new Date().toISOString())),
    [progress],
  );
  const totalSessions = progress?.sessions.length ?? 0;
  // сессии карточек, законченные сегодня: одна строка на сессию, а не на карточку
  const reviewsToday = useMemo(() => {
    const today = dayKey(new Date().toISOString());
    return (progress?.reviews ?? []).filter((r) => dayKey(r.finishedAt) === today).length;
  }, [progress]);

  const handleExport = useCallback(() => {
    const blob = new Blob([stringifyProgress(progress ?? emptyProgress())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = EXPORT_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // некоторые браузеры читают blob уже после обработки клика: отзываем URL
    // с задержкой, иначе файл изредка сохраняется пустым
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Файл ${EXPORT_FILENAME} сохранён.`);
  }, [progress]);

  const importFile = useCallback(async (file: File) => {
    let raw: string | null = null;
    try {
      raw = await file.text();
    } catch {
      raw = null;
    }
    const { progress: parsed, degraded } = parseProgressDetailed(raw);
    if (parsed === null) {
      setMessage("Файл не распознан");
      return;
    }
    // импорт — страховка от потери данных, поэтому файл с повреждённым разделом
    // карточек не принимаем: иначе он молча заменил бы сохранённые карточки пустыми
    if (degraded) {
      setMessage("Файл не загружен: раздел карточек в нём повреждён. Сохранённый прогресс не тронут.");
      return;
    }
    const normalized = normalizeActiveDays(parsed);
    saveProgress(normalized);
    setProgress(normalized);
    // a fresh import replaces whatever prompted the corrupted-progress notice
    clearBackup();
    setBackupNotice(false);
    setMessage("Прогресс загружен из файла.");
  }, []);

  const handleClear = useCallback(() => {
    const empty = emptyProgress();
    saveProgress(empty);
    setProgress(empty);
    clearBackup();
    setBackupNotice(false);
    setConfirming(false);
    setMessage("Прогресс очищен.");
  }, []);

  return (
    <div className="space-y-6" data-testid="progress-screen">
      <header>
        <h1 className="text-2xl font-semibold">Прогресс</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Результаты тестов хранятся только в этом браузере. Экспортируйте файл, чтобы перенести их
          на другое устройство.
        </p>
      </header>

      {backupNotice && (
        <p
          role="status"
          data-testid="progress-backup-notice"
          className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          Предыдущий прогресс не удалось прочитать; его копия сохранена в браузере под ключом
          anatomia.progress.v1.backup
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded border px-4 py-3">
        <p data-testid="streak" className="text-base font-semibold">
          Серия: {daysLabel(streak)}
        </p>
        <p className="text-sm text-neutral-600">Всего {sessionsLabel(totalSessions)}</p>
        <p className="text-sm text-neutral-600" data-testid="progress-reviews-today">
          Повторений сегодня: {reviewsToday}
        </p>
      </div>

      {data.status === "loading" && <p className="text-sm text-neutral-500">Загружаем темы…</p>}
      {data.status === "error" && (
        <p className="text-sm text-red-700">Не удалось загрузить список тем. Обновите страницу.</p>
      )}
      {data.status === "ready" && (
        <table className="w-full border-collapse text-sm" data-testid="progress-table">
          <caption className="sr-only">Освоенные понятия, выученные карточки и число сессий по темам</caption>
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
              <th scope="col" className="py-2 pr-4 font-semibold">Тема</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Освоено</th>
              <th scope="col" className="py-2 font-semibold">Сессии</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.id}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={3}
                  className="pt-4 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {group.ru}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.id} data-testid="progress-topic" data-topic={row.id} className="border-b">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">{row.ru}</th>
                  <td className="py-2 pr-4 whitespace-nowrap text-neutral-600">
                    <span className="block">освоено {row.known} из {row.total} понятий</span>
                    <span className="block text-xs text-neutral-500" data-testid="topic-cards">
                      Карточки: выучено {row.learned} из {row.cards}
                    </span>
                  </td>
                  <td className="py-2 whitespace-nowrap text-neutral-600">{sessionsLabel(row.sessions)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <button
          type="button"
          data-testid="progress-export"
          onClick={handleExport}
          className="rounded border px-3 py-2 text-sm hover:bg-neutral-100"
        >
          Экспорт
        </button>
        <button
          type="button"
          data-testid="progress-import"
          onClick={() => {
            setMessage(null);
            fileRef.current?.click();
          }}
          className="rounded border px-3 py-2 text-sm hover:bg-neutral-100"
        >
          Импорт
        </button>
        {/* скрытый input: кнопка выше даёт ему единый вид и доступ с клавиатуры */}
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          aria-label="Файл прогресса"
          data-testid="progress-import-input"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // сбрасываем значение, иначе повторный выбор того же файла не даст change
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Подтверждение очистки">
            <span className="text-sm text-neutral-600">Удалить весь прогресс?</span>
            <button
              type="button"
              data-testid="progress-clear-confirm"
              onClick={handleClear}
              className="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Да, очистить
            </button>
            <button
              type="button"
              data-testid="progress-clear-cancel"
              onClick={() => setConfirming(false)}
              className="rounded border px-3 py-2 text-sm hover:bg-neutral-100"
            >
              Отмена
            </button>
          </span>
        ) : (
          <button
            type="button"
            data-testid="progress-clear"
            onClick={() => {
              setMessage(null);
              setConfirming(true);
            }}
            className="rounded border px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Очистить прогресс
          </button>
        )}
      </div>

      {message !== null && (
        <p role="status" data-testid="progress-message" className="text-sm text-neutral-600">
          {message}
        </p>
      )}
    </div>
  );
}
