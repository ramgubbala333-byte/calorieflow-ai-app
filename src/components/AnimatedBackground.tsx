/**
 * Animated aurora background — floating gradient blobs + subtle grid.
 * Fixed, pointer-events-none, sits behind all content.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* grid overlay */}
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      {/* aurora blobs */}
      <div className="absolute -top-32 -left-24 w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-60 animate-blob-1"
        style={{ background: "radial-gradient(circle at 30% 30%, oklch(0.68 0.24 295 / 0.85), transparent 70%)" }}
      />
      <div className="absolute top-1/3 -right-24 w-[55vw] h-[55vw] max-w-[480px] max-h-[480px] rounded-full blur-3xl opacity-55 animate-blob-2"
        style={{ background: "radial-gradient(circle at 70% 50%, oklch(0.72 0.22 340 / 0.8), transparent 70%)" }}
      />
      <div className="absolute -bottom-32 left-1/4 w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full blur-3xl opacity-55 animate-blob-3"
        style={{ background: "radial-gradient(circle at 50% 50%, oklch(0.78 0.18 200 / 0.75), transparent 70%)" }}
      />

      {/* noise/grain */}
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }} />
    </div>
  );
}
