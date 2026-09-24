"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Та часть `MediaQueryList`, которой достаточно для подписки.
 * Отдельный тип нужен, чтобы `subscribeMatchMedia` тестировался без DOM
 * (vitest здесь работает в окружении `node`).
 */
export interface MediaQueryListLike {
  matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

/** Подписка на изменение медиазапроса; возвращает отписку. */
export function subscribeMatchMedia(mql: MediaQueryListLike, onChange: () => void): () => void {
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Один MediaQueryList на запрос: иначе matchMedia аллоцирует объект на каждый рендер. */
const mqlByQuery = new Map<string, MediaQueryList>();

function mediaQueryList(query: string): MediaQueryList {
  let mql = mqlByQuery.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    mqlByQuery.set(query, mql);
  }
  return mql;
}

/**
 * Совпадает ли медиазапрос прямо сейчас. На сервере ширины окна нет, поэтому
 * серверный снимок — всегда `false` (десктопная раскладка). Сегодня он не
 * используется: `/atlas` из-за `useSearchParams` под Suspense целиком уходит
 * в клиентский рендер, и первый же рендер знает настоящую ширину. Страховка
 * на случай, если страница когда-нибудь начнёт рендериться на сервере:
 * панель слоёв дополнительно несёт `hidden md:flex`, так что даже ошибочно
 * «десктопный» первый кадр не покажет её на телефоне.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      return subscribeMatchMedia(mediaQueryList(query), onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => (typeof window === "undefined" ? false : mediaQueryList(query).matches),
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getServerSnapshot() {
  return false;
}

/** Мобильная раскладка — всё, что уже Tailwind-брейкпойнта `md` (768 px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
