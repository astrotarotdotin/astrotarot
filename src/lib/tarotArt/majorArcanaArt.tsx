"use client";
// Original line-art symbolic illustrations for the Major Arcana.
// These depict each card's traditional archetypal symbolism (public-domain
// occult iconography going back centuries) in our own minimal line-art
// style — not a reproduction of any specific published/copyrighted deck.

const STROKE = "var(--gold)";
const STROKE_SOFT = "var(--violet-mid)";

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 60 90" width="100%" height="100%" fill="none" style={{ overflow: "visible" }}>
      {children}
    </svg>
  );
}

const S = { stroke: STROKE, strokeWidth: 1.3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const SS = { stroke: STROKE_SOFT, strokeWidth: 1, fill: "none", strokeLinecap: "round" as const };

export const MAJOR_ARCANA_ART: Record<string, React.ReactNode> = {
  "The Fool": (
    <Svg>
      <circle cx="30" cy="20" r="6" {...S} />
      <path d="M30 26 L30 55 M22 35 L38 32 M22 55 L30 42 L38 55" {...S} />
      <path d="M38 30 L46 20" {...S} />
      <circle cx="47" cy="18" r="4" {...S} />
      <path d="M5 70 Q30 55 55 70" {...SS} />
      <circle cx="30" cy="12" r="3" {...SS} />
    </Svg>
  ),
  "The Magician": (
    <Svg>
      <path d="M20 20 Q30 8 40 20" {...SS} />
      <circle cx="30" cy="22" r="5" {...S} />
      <path d="M30 27 L30 55 M20 35 L30 40 L40 30" {...S} />
      <path d="M18 60 L42 60" {...S} />
      <path d="M22 60 L22 55 M30 60 L30 53 M38 60 L38 55" {...SS} />
    </Svg>
  ),
  "The High Priestess": (
    <Svg>
      <path d="M8 20 L8 65 M52 20 L52 65" {...S} />
      <circle cx="30" cy="30" r="7" {...S} />
      <path d="M27 22 A5 5 0 1 0 27 32 A4 4 0 1 1 27 22" fill={STROKE} stroke="none" opacity="0.8" />
      <path d="M18 40 L42 40 L36 68 L24 68 Z" {...SS} />
    </Svg>
  ),
  "The Empress": (
    <Svg>
      <path d="M18 25 L30 12 L42 25 Z" {...S} />
      <circle cx="30" cy="38" r="9" {...S} />
      <path d="M30 47 L30 60" {...S} />
      <circle cx="30" cy="65" r="4" {...SS} />
      <path d="M14 70 Q30 60 46 70" {...SS} />
    </Svg>
  ),
  "The Emperor": (
    <Svg>
      <path d="M20 20 L20 12 L24 16 L30 10 L36 16 L40 12 L40 20 Z" {...S} />
      <rect x="16" y="20" width="28" height="14" {...S} />
      <path d="M24 34 L24 60 M36 34 L36 60" {...S} />
      <path d="M18 60 L42 60" {...S} />
      <circle cx="30" cy="45" r="4" {...SS} />
    </Svg>
  ),
  "The Hierophant": (
    <Svg>
      <path d="M12 20 L12 65 M48 20 L48 65" {...S} />
      <path d="M30 15 L30 45" {...S} />
      <path d="M24 22 L36 22 M25 30 L35 30" {...S} />
      <path d="M22 55 L38 55 L34 68 L26 68 Z" {...SS} />
      <path d="M20 40 L24 44 M40 40 L36 44" {...SS} />
    </Svg>
  ),
  "The Lovers": (
    <Svg>
      <circle cx="30" cy="14" r="6" {...S} />
      <path d="M22 30 Q30 24 38 30" {...SS} />
      <circle cx="18" cy="40" r="6" {...S} />
      <circle cx="42" cy="40" r="6" {...S} />
      <path d="M18 46 L18 65 M42 46 L42 65" {...S} />
      <path d="M18 55 L42 55" {...SS} />
    </Svg>
  ),
  "The Chariot": (
    <Svg>
      <rect x="16" y="35" width="28" height="20" {...S} />
      <circle cx="20" cy="60" r="6" {...S} />
      <circle cx="40" cy="60" r="6" {...S} />
      <path d="M22 35 L18 20 M38 35 L42 20" {...SS} />
      <path d="M14 20 L46 20" {...SS} />
      <path d="M24 45 L36 45" {...SS} />
    </Svg>
  ),
  "Strength": (
    <Svg>
      <path d="M22 16 Q30 10 38 16 Q30 22 22 16 Z" {...S} />
      <path d="M15 45 Q30 30 45 45 Q42 60 30 62 Q18 60 15 45 Z" {...SS} />
      <path d="M25 40 L30 46 L38 36" {...S} />
    </Svg>
  ),
  "The Hermit": (
    <Svg>
      <path d="M30 10 L30 18" {...S} />
      <path d="M40 14 L38 20 L42 20 Z" fill={STROKE} stroke="none" />
      <path d="M22 25 Q30 20 38 25 L42 65 L18 65 Z" {...S} />
      <path d="M30 30 L30 60" {...SS} />
      <circle cx="46" cy="35" r="3" {...SS} />
    </Svg>
  ),
  "Wheel of Fortune": (
    <Svg>
      <circle cx="30" cy="42" r="20" {...S} />
      <circle cx="30" cy="42" r="4" {...S} />
      <path d="M30 22 L30 62 M10 42 L50 42 M16 28 L44 56 M16 56 L44 28" {...SS} />
    </Svg>
  ),
  "Justice": (
    <Svg>
      <path d="M30 12 L30 45" {...S} />
      <path d="M14 22 L46 22" {...S} />
      <path d="M14 22 Q10 32 18 34 Q22 32 14 22" {...SS} />
      <path d="M46 22 Q50 32 42 34 Q38 32 46 22" {...SS} />
      <path d="M30 45 L20 65 M30 45 L40 65" {...S} />
      <path d="M22 62 L38 62" {...S} />
    </Svg>
  ),
  "The Hanged Man": (
    <Svg>
      <path d="M14 15 L46 15" {...S} />
      <path d="M30 15 L30 30" {...S} />
      <circle cx="30" cy="38" r="6" {...S} />
      <path d="M30 44 L22 60 M30 44 L38 60" {...S} />
      <path d="M26 60 L26 68 M34 60 L34 68" {...SS} />
      <circle cx="30" cy="30" r="3" {...SS} />
    </Svg>
  ),
  "Death": (
    <Svg>
      <circle cx="30" cy="30" r="9" {...S} />
      <path d="M23 27 L27 31 M37 27 L33 31 M25 35 L35 35" {...S} />
      <path d="M30 39 L30 55 M22 48 L38 45 M22 65 L30 55 L38 65" {...S} />
      <path d="M40 20 Q52 25 44 40" {...SS} />
    </Svg>
  ),
  "Temperance": (
    <Svg>
      <path d="M20 20 L18 40 Q18 45 24 45" {...S} />
      <path d="M40 20 L42 40 Q42 45 36 45" {...S} />
      <path d="M24 45 Q30 50 36 45" {...SS} />
      <path d="M20 55 L20 65 M40 55 L40 65" {...S} />
      <path d="M18 65 L22 65 M38 65 L42 65" {...SS} />
      <path d="M28 25 Q30 30 32 25" {...SS} />
    </Svg>
  ),
  "The Devil": (
    <Svg>
      <path d="M20 18 L16 10 M40 18 L44 10" {...S} />
      <circle cx="30" cy="26" r="8" {...S} />
      <path d="M22 40 L38 40 L34 60 L26 60 Z" {...S} />
      <circle cx="18" cy="66" r="4" {...SS} />
      <circle cx="42" cy="66" r="4" {...SS} />
      <path d="M18 62 L18 68 M42 62 L42 68" {...SS} />
    </Svg>
  ),
  "The Tower": (
    <Svg>
      <rect x="20" y="25" width="20" height="40" {...S} />
      <path d="M20 25 L30 12 L40 25" {...S} />
      <path d="M32 8 L26 20 L32 18 L26 30" stroke={STROKE} strokeWidth="1.5" fill="none" />
      <path d="M14 20 L20 30 M46 20 L40 30" {...SS} />
      <circle cx="14" cy="18" r="2" {...SS} />
      <circle cx="46" cy="18" r="2" {...SS} />
    </Svg>
  ),
  "The Star": (
    <Svg>
      <path d="M30 8 L33 16 L41 16 L34 21 L37 29 L30 24 L23 29 L26 21 L19 16 L27 16 Z" {...S} />
      <path d="M15 45 Q30 38 45 45" {...SS} />
      <path d="M22 50 L22 62 M38 50 L38 62" {...S} />
      <circle cx="12" cy="30" r="1.5" {...SS} />
      <circle cx="48" cy="30" r="1.5" {...SS} />
    </Svg>
  ),
  "The Moon": (
    <Svg>
      <path d="M34 14 A10 10 0 1 0 34 34 A8 8 0 1 1 34 14" fill={STROKE} stroke="none" opacity="0.85" />
      <rect x="12" y="45" width="10" height="18" {...SS} />
      <rect x="38" y="45" width="10" height="18" {...SS} />
      <path d="M22 65 Q30 55 38 65" {...S} />
      <circle cx="30" cy="70" r="4" {...SS} />
    </Svg>
  ),
  "The Sun": (
    <Svg>
      <circle cx="30" cy="30" r="10" {...S} />
      <path d="M30 10 L30 16 M30 44 L30 50 M10 30 L16 30 M44 30 L50 30 M16 16 L20 20 M40 40 L44 44 M16 44 L20 40 M40 20 L44 16" {...S} />
      <circle cx="30" cy="65" r="5" {...SS} />
      <path d="M20 75 Q30 68 40 75" {...SS} />
    </Svg>
  ),
  "Judgement": (
    <Svg>
      <path d="M18 20 Q30 12 42 20" {...S} />
      <circle cx="30" cy="24" r="4" {...S} />
      <path d="M30 28 L30 34" {...SS} />
      <rect x="18" y="50" width="10" height="16" {...SS} />
      <rect x="32" y="50" width="10" height="16" {...SS} />
      <path d="M23 50 L23 42 M37 50 L37 42" {...S} />
    </Svg>
  ),
  "The World": (
    <Svg>
      <ellipse cx="30" cy="42" rx="20" ry="24" {...S} />
      <circle cx="30" cy="30" r="5" {...SS} />
      <path d="M30 35 L30 50 M22 42 L38 42" {...SS} />
      <path d="M14 20 L18 24 M46 20 L42 24 M14 62 L18 58 M46 62 L42 58" {...SS} />
    </Svg>
  ),
};
