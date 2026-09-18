"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000;

function ping() {
  fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
}

// Keeps User.lastActiveAt fresh while the app is open, so group member
// lists can show "Online" / "zuletzt online vor X". Fires on mount, every
// minute after, and whenever the tab regains focus (covers phone
// lock/unlock and tab-switching without waiting for the next interval).
export function Heartbeat() {
  useEffect(() => {
    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
