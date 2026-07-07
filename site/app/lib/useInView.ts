"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** True once the element has entered (or come within `rootMargin` of) the
 *  viewport. Used to lazy-boot engine instances and to trigger reveals. */
export function useInView<T extends HTMLElement>(
  rootMargin = "0px",
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  // Environments without IntersectionObserver (old browsers, some crawlers)
  // start "in view" so content is never withheld from them.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, inView]);

  return [ref, inView];
}
