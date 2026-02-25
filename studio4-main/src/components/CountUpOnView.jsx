// Animated counter that triggers once when the element enters the viewport.
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CountUpOnView({
  target = 0,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const [value, setValue] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const ref = useRef(null);
  const targetNumber = useMemo(() => Number(target) || 0, [target]);

  useEffect(() => {
    const node = ref.current;
    if (!node || hasPlayed) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasPlayed(true);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasPlayed]);

  useEffect(() => {
    if (!hasPlayed) return undefined;
    let raf;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(targetNumber * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasPlayed, targetNumber, duration]);

  const formatted = useMemo(() => {
    const fixed = value.toFixed(decimals);
    return `${prefix}${decimals ? fixed : Number(fixed)}${suffix}`;
  }, [value, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
