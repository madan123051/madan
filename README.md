# Madan Wilds Aura

Personal photography landing page, private gallery access, and admin photo
upload flow for Madan Shrestha.

## Features

- Professional landing page with Wilds Aura and Luma links.
- Private gallery route at `/gallery`.
- Admin upload route at `/admin`.
- Firebase Authentication, Firestore, Storage, and optional Analytics wiring.
- Gallery filters by year, month, event, and country.
- Select-and-download photo flow.
- Noindex metadata on private gallery and admin pages.
- Vercel config that uses `next build`.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web app values from Firebase Console.

## Firebase Environment Variables

```txt
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_DATABASE_ID=madan
```

See [docs/firebase-setup.md](docs/firebase-setup.md) for Firestore and Storage
rules.

## Vercel

The project includes `vercel.json` so Vercel runs:

```bash
npx next build
```

Add the Firebase variables in Vercel Project Settings before deploying.

## Sites

This checkout also supports the ChatGPT Sites/Vinext deployment flow through
the existing `npm run build` script.
