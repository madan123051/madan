# Madan Wilds Aura

Personal photography landing page, private gallery access, and admin upload flow for Madan Shrestha.

## What is included

- Professional landing page for Madan Wilds Aura.
- Links to Wilds Aura, Luma, private gallery, admin upload, and contact.
- Firebase-ready private gallery at `/gallery`.
- Admin upload flow at `/admin` using Firebase Auth, Firestore, and Storage.
- Gallery filtering by year, month, event, and country.
- Select-and-download flow for gallery photos.
- Noindex metadata on private gallery and admin pages.
- Vercel config with `npm install` and `npx next build`.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Firebase web app values from Firebase Console.

## Vercel setup

1. Import this repository in Vercel.
2. Add every `NEXT_PUBLIC_FIREBASE_*` value from `.env.example` in Vercel Project Settings -> Environment Variables.
3. Deploy. Vercel will run `npm install` and `npx next build`.

## Firebase setup

See `docs/firebase-setup.md` for Auth, Firestore, and Storage rules.

Live Sites preview: https://madan-wilds-aura.breezy-knoll-5462.chatgpt.site
