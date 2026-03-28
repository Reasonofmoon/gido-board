# 碁Vibe — 바이브 코딩 워크벤치

## Project Overview
Goal-driven vibe coding platform using Go/Baduk metaphors.
Users set a goal → get language/library recommendations → follow kifu-style development sequence.

## Tech Stack
- React 19 + Vite 8 + TypeScript 5.9
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- React Router DOM (SPA routing)
- Lucide React (icons)

## Architecture
```
src/
├── pages/           # Route-level components
│   ├── LandingPage  # Hero + CTA
│   └── GoalWizard   # 3-step onboarding (Goal → Experience → Recommendation)
├── components/      # Reusable UI (Board, Stone, StrategyPanel)
├── data/            # Static data (mandala.ts — language/library catalog)
├── lib/             # Business logic (recommend.ts — recommendation engine)
└── App.tsx          # Board page (19x19 Go board + strategy panel)
```

## Routes
- `/` — Landing page
- `/wizard` — GoalWizard (goal → experience → stack recommendation)
- `/board` — Go board visualization with strategy panel

## Key Concepts
- **포석 (Fuseki)**: Project foundation/setup
- **정석 (Joseki)**: Standard architectural patterns
- **선수 (Sente)**: Taking initiative (core features)
- **묘수 (Myo)**: Brilliant optimizations
- **끝내기 (Endgame)**: Deployment and polish
- **승률 (Win Rate)**: Project health percentage

## Conventions
- Mobile-first responsive design (min touch target: 44px)
- Dark mode only (bg-[#07090F])
- Korean UI text, English code comments
- CSS Modules for Board/StrategyPanel, Tailwind for everything else
