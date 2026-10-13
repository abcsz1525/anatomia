/** Подпись состояния сцены над доком: текст считает captionFor(). */
export function SceneCaption({ text }: { text: string }) {
  return (
    <div
      className="pointer-events-none flex max-w-full items-center gap-3 text-center text-[9px] uppercase tracking-[0.11em] text-studio-muted md:text-[10px]"
      data-testid="scene-caption"
    >
      <span className="h-px w-6 shrink-0 bg-studio-border" />
      {/* светлый ореол: подпись читается и поверх модели */}
      <span className="min-w-0 [overflow-wrap:anywhere] [text-shadow:0_0_2px_var(--studio-bg),0_0_6px_var(--studio-bg)]">{text}</span>
      <span className="h-px w-6 shrink-0 bg-studio-border" />
    </div>
  );
}
