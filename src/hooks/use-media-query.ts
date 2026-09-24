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

/**
 * Совпадает ли медиазапрос прямо сейчас. На сервере (и в момент гидратации)
 * — всегда `false`: ширины окна там нет, поэтому разметка рендерится
 * десктопной, а после гидратации `useSyncExternalStore` перечитает снимок.
 * Чтобы мобильный пользователь не увидел вспышку десктопной раскладки,
 * элементы, скрываемые на мобайле, дополнительно несут классы `hidden md:*`.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      return subscribeMatchMedia(window.matchMedia(query), onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => (typeof window === "undefined" ? false : window.matchMedia(query).matches),
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
