"use client";
// Minor Arcana rendered in the traditional "pip" style (suit symbols
// arranged per rank) — an authentic, centuries-old tarot tradition
// (seen in historic Marseille-style decks) distinct from the illustrated
// Major Arcana above. Gives each of the 56 cards a genuinely unique,
// original layout without needing 56 individually painted scenes.

const GOLD = "var(--gold)";
const VIOLET = "var(--violet-mid)";

function WandGlyph({ x, y }: { x: number; y: number }) {
  return <rect x={x - 1.2} y={y - 7} width="2.4" height="14" rx="1.2" fill={GOLD} transform={`rotate(20 ${x} ${y})`} />;
}
function CupGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4 -5 Q-4 3 0 4 Q4 3 4 -5 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <path d="M-1.5 4 L-1.5 6 M1.5 4 L1.5 6 M-3 6 L3 6" stroke={GOLD} strokeWidth="1" />
    </g>
  );
}
function SwordGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(0)`}>
      <path d="M0 -7 L0 5" stroke={GOLD} strokeWidth="1.3" />
      <path d="M-3 5 L3 5" stroke={GOLD} strokeWidth="1.3" />
      <path d="M-1.5 -7 L0 -9 L1.5 -7" fill="none" stroke={GOLD} strokeWidth="1" />
    </g>
  );
}
function PentacleGlyph({ x, y }: { x: number; y: number }) {
  const pts = Array.from({ length: 5 }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return [x + Math.cos(angle) * 4, y + Math.sin(angle) * 4];
  });
  return (
    <g>
      <circle cx={x} cy={y} r="6" fill="none" stroke={GOLD} strokeWidth="0.8" />
      <polygon
        points={[0, 2, 4, 1, 3].map((i) => pts[i].join(",")).join(" ")}
        fill="none"
        stroke={GOLD}
        strokeWidth="1"
      />
    </g>
  );
}

const GLYPHS: Record<string, (p: { x: number; y: number }) => React.ReactNode> = {
  wands: (p) => <WandGlyph {...p} />,
  cups: (p) => <CupGlyph {...p} />,
  swords: (p) => <SwordGlyph {...p} />,
  pentacles: (p) => <PentacleGlyph {...p} />,
};

// Layout positions (in a 60x90 viewbox) for pip counts 1-10, loosely
// following traditional playing-card pip arrangements.
const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[30, 45]],
  2: [[30, 25], [30, 65]],
  3: [[30, 20], [30, 45], [30, 70]],
  4: [[20, 25], [40, 25], [20, 65], [40, 65]],
  5: [[20, 25], [40, 25], [30, 45], [20, 65], [40, 65]],
  6: [[20, 22], [40, 22], [20, 45], [40, 45], [20, 68], [40, 68]],
  7: [[20, 20], [40, 20], [30, 35], [20, 48], [40, 48], [20, 70], [40, 70]],
  8: [[20, 18], [40, 18], [20, 36], [40, 36], [20, 54], [40, 54], [20, 72], [40, 72]],
  9: [[20, 16], [40, 16], [20, 32], [40, 32], [30, 45], [20, 58], [40, 58], [20, 74], [40, 74]],
  10: [[20, 14], [40, 14], [20, 28], [40, 28], [20, 42], [40, 42], [20, 58], [40, 58], [20, 72], [40, 72]],
};

function CourtFigure({ suit, tier }: { suit: string; tier: "page" | "knight" | "queen" | "king" }) {
  // Simple distinct silhouette per court rank, topped with the suit glyph
  const crownShapes: Record<string, React.ReactNode> = {
    page: <path d="M22 22 L26 14 L30 20 L34 14 L38 22 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />,
    knight: <path d="M20 22 L30 10 L40 22 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />,
    queen: (
      <path d="M20 20 L23 12 L27 18 L30 10 L33 18 L37 12 L40 20 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
    ),
    king: (
      <path d="M18 20 L21 10 L26 17 L30 8 L34 17 L39 10 L42 20 Z" fill="none" stroke={GOLD} strokeWidth="1.3" />
    ),
  };
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" fill="none">
      {crownShapes[tier]}
      <path d="M30 24 L30 40" stroke={VIOLET} strokeWidth="1" />
      <path d="M20 55 Q30 40 40 55 L38 68 L22 68 Z" fill="none" stroke={VIOLET} strokeWidth="1.1" />
      {GLYPHS[suit]({ x: 30, y: 45 })}
    </svg>
  );
}

export function MinorArcanaArt({ suit, rank }: { suit: string; rank: number }) {
  if (rank >= 11) {
    const tierMap: Record<number, "page" | "knight" | "queen" | "king"> = {
      11: "page",
      12: "knight",
      13: "queen",
      14: "king",
    };
    return <CourtFigure suit={suit} tier={tierMap[rank]} />;
  }

  const positions = PIP_LAYOUTS[rank] || PIP_LAYOUTS[1];
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" fill="none">
      {positions.map(([x, y], i) => (
        <g key={i}>{GLYPHS[suit]({ x, y })}</g>
      ))}
    </svg>
  );
}
