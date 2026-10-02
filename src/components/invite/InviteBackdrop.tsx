import { useId } from "react";

const WORD = "NEXUS";

/** Rows of outlined NEXUS wordmarks, tilted, with a few brighter accents. Pure decoration. */
export function InviteBackdrop() {
  const id = useId();
  const pattern = `${id}-wordmark`;
  const glow = `${id}-glow`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full font-sans" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={pattern} width="600" height="300" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
            <g fill="none" fontSize="62" fontWeight="900" letterSpacing="5">
              <g stroke="#0A2E1D" strokeWidth="1.6">
                <text x="0" y="56">{WORD}</text>
                <text x="300" y="56">{WORD}</text>
                <text x="-150" y="131">{WORD}</text>
                <text x="150" y="131">{WORD}</text>
                <text x="450" y="131">{WORD}</text>
                <text x="0" y="206">{WORD}</text>
                <text x="-150" y="281">{WORD}</text>
                <text x="150" y="281">{WORD}</text>
                <text x="450" y="281">{WORD}</text>
              </g>
              <text x="300" y="206" stroke="#00E575" strokeWidth="1.4" opacity="0.22">
                {WORD}
              </text>
            </g>
          </pattern>
          <radialGradient id={glow} cx="50%" cy="34%" r="70%">
            <stop offset="0" stopColor="#00E575" stopOpacity="0.14" />
            <stop offset="0.55" stopColor="#00E575" stopOpacity="0.03" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pattern})`} />
        <rect width="100%" height="100%" fill={`url(#${glow})`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
