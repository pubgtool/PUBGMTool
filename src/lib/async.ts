/** Minimum time an auth action shows its spinner, so quick local work still reads as "processing". */
export const AUTH_PROCESSING_MS = 450;

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
