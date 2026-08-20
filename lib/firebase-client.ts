"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { FirebaseBrowserConfig } from "./firebase-config";

const firebaseAppName = "madan-wilds-aura";

export function getFirebaseApp(
  config: FirebaseBrowserConfig | null,
): FirebaseApp | null {
  if (!config) {
    return null;
  }

  return (
    getApps().find((app) => app.name === firebaseAppName) ??
    initializeApp(config, firebaseAppName)
  );
}

export function getFirebaseServices(config: FirebaseBrowserConfig | null) {
  const app = getFirebaseApp(config);

  if (!app) {
    return null;
  }

  return {
    app,
    auth: getAuth(app),
  };
}

export async function enableFirebaseAnalytics(
  config: FirebaseBrowserConfig | null,
) {
  if (!config?.measurementId || typeof window === "undefined") {
    return;
  }

  const app = getFirebaseApp(config);

  if (!app) {
    return;
  }

  const { getAnalytics, isSupported } = await import("firebase/analytics");

  if (await isSupported()) {
    getAnalytics(app);
  }
}
