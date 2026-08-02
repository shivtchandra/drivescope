<div align="center">

# 🚗 DriveScope

**Find the right car. Not just the popular one.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=three.dotjs&logoColor=white)

[**Live App →**](https://carsim-lovat.vercel.app)

</div>

---

DriveScope is a car discovery and comparison platform built to cut through
marketing noise. Instead of ranking cars by what's trending, it surfaces cars
by what actually fits — budget, running cost, and real ownership feedback —
and renders them in interactive 3D.

## Features

| Route | What it does |
|---|---|
| `/explore` | Browse & filter the full car catalog |
| `/cars/[modelId]` | Deep-dive spec sheet per model, with 3D preview |
| `/compare` & `/compare/[slug]` | Side-by-side comparison of two models |
| `/cost` | Total cost of ownership calculator |
| `/drive` | Interactive 3D drive/showcase view |
| `/race` | Head-to-head performance comparison |
| `/simulate` | Simulation sandbox |
| `/wall` | Community wall — real owner voices & reviews |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Three.js** / **@react-three/fiber** / **drei** — 3D rendering
- **Firebase** (Firestore) — data + admin seeding
- **Recharts** — cost/spec visualizations
- **GSAP** + **Framer Motion** — interaction & motion
- **TanStack Table** — data-dense comparison views

## Data

Car specs, pricing, and owner-review data live under `data/` as structured
JSON (`models.json`, `variants.json`, `cost-params.json`,
`detailed-reviews.json`, `vehicle-dna.json`, etc.), seeded into Firestore via
`scripts/seed-firestore.mjs`.

## Getting Started

```bash
npm install
npm run db:seed   # seed Firestore from data/
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```
