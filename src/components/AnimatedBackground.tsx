/**
 * Animated aurora background — floating gradient blobs + subtle grid.
 * Fixed, pointer-events-none, sits behind all content. Theme-aware via CSS vars.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* grid overlay — adapts to theme */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] text-foreground" />

      {/* aurora blobs — colors from theme tokens */}
      <div
        className="absolute -top-32 -left-24 w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-50 dark:opacity-60 animate-blob-1"
        style={{ background: "radial-gradient(circle at 30% 30%, var(--glow), transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[55vw] h-[55vw] max-w-[480px] max-h-[480px] rounded-full blur-3xl opacity-45 dark:opacity-55 animate-blob-2"
        style={{ background: "radial-gradient(circle at 70% 50%, var(--glow-2), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-45 dark:opacity-55 animate-blob-3"
        style={{ background: "radial-gradient(circle at 50% 50%, var(--glow-3), transparent 70%)" }}
      />
    </div>
  );
}
