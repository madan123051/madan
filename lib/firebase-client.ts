"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import type { FirebaseBrowserConfig } from "./firebase-config";

export function getFirebaseApp(
  config: FirebaseBrowserConfig | null,
): FirebaseApp | null {
  if (!config) {
    return null;
  }

  return getApps()[0] ?? initializeApp(config);
}

export function getFirebaseServices(config: FirebaseBrowserConfig | null) {
  const app = getFirebaseApp(config);

  if (!app) {
    return null;
  }

  return {
    app,
    auth: getAuth(app),
    storage: getStorage(app),
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
