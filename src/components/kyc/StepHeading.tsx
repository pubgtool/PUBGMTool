"use client";

import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  /** Take focus on mount, so a screen reader announces the new step after navigating. */
  moveFocus: boolean;
}

/** Step title that can receive focus. Steps mount fresh on each change, so mount is the right moment. */
export function StepHeading({ children, moveFocus }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (moveFocus) ref.current?.focus({ preventScroll: true });
    // Only on mount: the step remounts whenever it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <h3 ref={ref} data-step-heading tabIndex={-1} className="text-base font-semibold outline-none">
      {children}
    </h3>
  );
}
