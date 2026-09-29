"use client";

import { useMemo } from "react";
import { encode } from "uqr";

interface QrCodeProps {
  value: string;
  label: string;
  className?: string;
}

/**
 * Scannable vector QR. Error correction level H leaves headroom for the
 * centre mark, which covers under 5% of the modules.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  const { path, count } = useMemo(() => {
    const { data, size } = encode(value, { ecc: "H", border: 0 });
    let d = "";
    for (let y = 0; y < size; y++) {
      const row = data[y] ?? [];
      let x = 0;
      while (x < size) {
        if (!row[x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < size && row[x]) x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      }
    }
    return { path: d, count: size };
  }, [value]);

  const logo = Math.round(count * 0.2);
  const offset = Math.floor((count - logo) / 2);
  const pad = 2;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-pad} ${-pad} ${count + pad * 2} ${count + pad * 2}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={-pad} y={-pad} width={count + pad * 2} height={count + pad * 2} fill="#fff" />
      <path d={path} fill="#020617" />
      <rect x={offset - 0.5} y={offset - 0.5} width={logo + 1} height={logo + 1} rx={1.6} fill="#fff" />
      <rect x={offset} y={offset} width={logo} height={logo} rx={1.3} fill="#020617" />
      <text
        x={offset + logo / 2}
        y={offset + logo / 2}
        fill="#fff"
        fontSize={logo * 0.62}
        fontWeight={700}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        N
      </text>
    </svg>
  );
}
