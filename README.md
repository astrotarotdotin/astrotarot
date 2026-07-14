# AstroTarot

Real project scaffold — Next.js + Tailwind + Framer Motion + Supabase + Razorpay.

See `SYSTEM.md` in this folder for full architecture, schema, business rules, and build order.

## Setup
```
npm install
cp .env.example .env.local   # fill in real keys
npm run dev
```

## Design system
Twilight palette + nebula/glitter effects locked in `tailwind.config.ts` and `src/app/globals.css`.
Do not increase particle density in `MagicLayer.tsx` past MAX_PARTICLES=55 without re-checking
against the "hazy film" issue found in design review — see comments in that file.
