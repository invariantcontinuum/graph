"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Restrained vanilla-tilt wrapper: fine pointers only, no glare, and inert
 *  under prefers-reduced-motion. Purely decorative depth on capability tiles. */
export function Tilt({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let destroyed = false;
    import("vanilla-tilt").then(({ default: VanillaTilt }) => {
      if (destroyed || !ref.current) return;
      VanillaTilt.init(ref.current, {
        max: 5,
        speed: 900,
        scale: 1.012,
        glare: false,
        gyroscope: false,
        perspective: 1200,
      });
    });
    return () => {
      destroyed = true;
      (el as HTMLDivElement & { vanillaTilt?: { destroy(): void } }).vanillaTilt?.destroy();
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}
