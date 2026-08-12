// Standard 78-card tarot deck — traditional card names (public domain).
// Images are not yet available from Ishita — using a consistent card-back
// design for now (see FreeReadingPage). Swap in real card art via
// Cloudinary once she provides it; just add an `image` field per card.

export interface TarotCard {
  id: number;
  name: string;
  arcana: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  rank?: number; // 1-14, for minor arcana pip display
}

// Maps each Major Arcana card to a lucide-react icon name — original
// symbolic artwork, not reproductions of any published tarot deck (which
// would be copyrighted). Chosen to reflect each card's traditional theme.
export const MAJOR_ARCANA_ICONS: Record<string, string> = {
  "The Fool": "Feather",
  "The Magician": "Wand2",
  "The High Priestess": "Moon",
  "The Empress": "Flower2",
  "The Emperor": "Crown",
  "The Hierophant": "BookOpen",
  "The Lovers": "Heart",
  "The Chariot": "Navigation",
  "Strength": "Infinity",
  "The Hermit": "Lamp",
  "Wheel of Fortune": "Disc",
  "Justice": "Scale",
  "The Hanged Man": "Pause",
  "Death": "Skull",
  "Temperance": "Droplets",
  "The Devil": "Link",
  "The Tower": "Zap",
  "The Star": "Star",
  "The Moon": "MoonStar",
  "The Sun": "Sun",
  "Judgement": "BellRing",
  "The World": "Globe",
};

// Suit -> icon, for Minor Arcana (56 cards share these 4 icons + rank number)
export const SUIT_ICONS: Record<string, string> = {
  wands: "Wand2",
  cups: "Droplet",
  swords: "Swords",
  pentacles: "Coins",
};

const majorArcana: TarotCard[] = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World",
].map((name, i) => ({ id: i, name, arcana: "major" as const }));

const suits: Array<"wands" | "cups" | "swords" | "pentacles"> = ["wands", "cups", "swords", "pentacles"];
const rankNames = [
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Page", "Knight", "Queen", "King",
];

const minorArcana: TarotCard[] = [];
let idCounter = 22;
for (const suit of suits) {
  rankNames.forEach((rank, rankIdx) => {
    minorArcana.push({
      id: idCounter++,
      name: `${rank} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
      arcana: "minor",
      suit,
      rank: rankIdx + 1,
    });
  });
}

export const TAROT_DECK: TarotCard[] = [...majorArcana, ...minorArcana];

export function drawRandomCards(count: number): TarotCard[] {
  const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

