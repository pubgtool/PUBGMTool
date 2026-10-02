import { encode } from "uqr";

export interface QrModel {
  size: number;
  data: boolean[][];
  /** Dark modules as one SVG path in module units. */
  path: string;
}

export function buildQr(value: string): QrModel {
  const { data, size } = encode(value, { ecc: "Q", border: 0 });
  let path = "";
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
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  }
  return { size, data, path };
}

const PNG_WIDTH = 1080;
const QR_MAX = 720;
const TOP = 150;

/** The QR on a white sheet with its quiet zone and the code printed underneath. */
export function renderQrPng(model: QrModel, code: string, caption: string): Promise<Blob> {
  const cell = Math.floor(QR_MAX / model.size);
  const qr = cell * model.size;
  const left = Math.floor((PNG_WIDTH - qr) / 2);
  const height = TOP + qr + 300;

  const canvas = document.createElement("canvas");
  canvas.width = PNG_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not available"));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PNG_WIDTH, height);
  ctx.fillStyle = "#020617";
  model.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(left + x * cell, TOP + y * cell, cell, cell);
    }),
  );

  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  ctx.font = "700 112px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(code, PNG_WIDTH / 2, TOP + qr + 150);
  ctx.fillStyle = "#4B5563";
  ctx.font = "600 38px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(caption, PNG_WIDTH / 2, TOP + qr + 228);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
