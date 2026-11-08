import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Trade-In Pro motion system — reusable, dependency-free primitives.
 * All animations use transform/opacity only and are disabled under
 * prefers-reduced-motion (see src/styles.css).
 */

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Fade + rise entrance on mount, with optional delay (ms). */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-fade-up", className)}
      style={{ "--motion-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Reveals children when they scroll into view (IntersectionObserver). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("motion-reveal", visible && "motion-visible", className)}
      style={{ "--motion-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Staggers the entrance of its direct children (fade-up, 70ms step). */
export function Stagger({
  children,
  step = 70,
  className,
}: {
  children: ReactNode[];
  step?: number;
  className?: string;
}) {
  return (
    <>
      {children.map((child, i) => (
        <div
          key={i}
          className={cn("animate-fade-up", className)}
          style={{ "--motion-delay": `${i * step}ms` } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </>
  );
}

/** Animated number that counts up to `value` (ease-out, ~600ms). */
export function CountUp({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 600,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (from === to || prefersReducedMotion()) {
      setDisplay(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}

/** Replays a fade-up transition whenever the route changes. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
