"use client";
import { TarotCard } from "@/lib/tarotDeck";
import { MAJOR_ARCANA_ART } from "@/lib/tarotArt/majorArcanaArt";
import { MinorArcanaArt } from "@/lib/tarotArt/minorArcanaArt";

interface Props {
  card: TarotCard;
  size?: "small" | "large";
}

export default function TarotCardFace({ card, size = "small" }: Props) {
  const isLarge = size === "large";

  return (
    <div
      style={{
        width: isLarge ? 110 : "100%",
        height: isLarge ? 170 : "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isLarge ? 8 : 3,
        padding: isLarge ? 10 : 3,
      }}
    >
      <div style={{ width: isLarge ? 70 : "78%", flex: isLarge ? "none" : 1 }}>
        {card.arcana === "major" ? (
          MAJOR_ARCANA_ART[card.name]
        ) : (
          <MinorArcanaArt suit={card.suit || "wands"} rank={card.rank || 1} />
        )}
      </div>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: isLarge ? 11 : 6.5,
          color: "var(--lavender)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {card.name}
      </p>
    </div>
  );
}
