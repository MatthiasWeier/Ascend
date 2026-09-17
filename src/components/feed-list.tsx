// Pure-CSS fade/slide-in with a per-item stagger delay - deliberately not
// JS-driven (no framer-motion/motion). A JS animation library can end up
// stuck at its `initial` (invisible) state if its mount effect never runs
// for any reason; a CSS animation always plays on insertion regardless of
// what JS does afterwards.
export function FeedList({ children }: { children: React.ReactNode }) {
  const childArray = Array.isArray(children) ? children : [children];
  return (
    <div className="flex flex-col gap-3">
      {childArray.map((child, i) => (
        <div
          key={i}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
          style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
