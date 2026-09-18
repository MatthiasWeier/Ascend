"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;
const MAX_PULL = 100;
const MIN_REFRESH_MS = 500;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing || window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      setDragging(true);
    },
    [refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current == null || refreshing) return;
      if (window.scrollY > 0) {
        startY.current = null;
        setDragging(false);
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      setPullDistance(delta > 0 ? Math.min(delta * 0.5, MAX_PULL) : 0);
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    setDragging(false);
    if (startY.current == null) return;
    startY.current = null;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(48);
      const started = Date.now();
      await onRefresh();
      const elapsed = Date.now() - started;
      if (elapsed < MIN_REFRESH_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS - elapsed));
      }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  const height = refreshing ? 48 : pullDistance;

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden",
          !dragging && "transition-[height] duration-200"
        )}
        style={{ height }}
      >
        <RefreshCw
          className={cn("size-5 text-muted-foreground", refreshing && "animate-spin")}
          style={!refreshing ? { transform: `rotate(${(pullDistance / MAX_PULL) * 360}deg)` } : undefined}
        />
      </div>
      {children}
    </div>
  );
}
