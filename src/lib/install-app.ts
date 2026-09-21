"use client";

import { useSyncExternalStore } from "react";

// "Install as app" helpers: what device this is, whether Ascend already runs
// as an installed app, the browser's install prompt (Chrome/Android), and the
// per-device "don't show the banner" flags.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallEnv = { mobile: boolean; ios: boolean; standalone: boolean };

const FOREVER_KEY = "ascend:install-banner-hidden";
const SESSION_KEY = "ascend:install-banner-closed";

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Registered when this module loads (the dashboard layout imports it), so the
// event isn't missed if the browser fires it before the banner mounts.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

let envCache: InstallEnv | null = null;
function getEnv(): InstallEnv {
  if (!envCache) {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    envCache = { mobile: ios || /Android|Mobile/i.test(ua), ios, standalone };
  }
  return envCache;
}

function readFlag(kind: "local" | "session", key: string): boolean {
  try {
    return (kind === "local" ? localStorage : sessionStorage).getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(kind: "local" | "session", key: string, on: boolean) {
  try {
    const storage = kind === "local" ? localStorage : sessionStorage;
    if (on) storage.setItem(key, "1");
    else storage.removeItem(key);
  } catch {}
  notify();
}

export function useInstallApp() {
  const env = useSyncExternalStore(subscribe, getEnv, () => null);
  const hiddenForever = useSyncExternalStore(subscribe, () => readFlag("local", FOREVER_KEY), () => true);
  const closedThisSession = useSyncExternalStore(subscribe, () => readFlag("session", SESSION_KEY), () => true);
  const canPrompt = useSyncExternalStore(subscribe, () => deferredPrompt !== null, () => false);
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false);

  return {
    env,
    hiddenForever,
    closedThisSession,
    canPrompt,
    isInstalled,
    // Chrome/Android: opens the native install dialog.
    async promptInstall() {
      if (!deferredPrompt) return false;
      const event = deferredPrompt;
      await event.prompt();
      const choice = await event.userChoice.catch(() => null);
      deferredPrompt = null;
      notify();
      return choice?.outcome === "accepted";
    },
    closeForNow: () => writeFlag("session", SESSION_KEY, true),
    hideForever: () => writeFlag("local", FOREVER_KEY, true),
    showAgain: () => {
      writeFlag("local", FOREVER_KEY, false);
      writeFlag("session", SESSION_KEY, false);
    },
  };
}
