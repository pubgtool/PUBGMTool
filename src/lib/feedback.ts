const SOUND_KEY = "nexus-sound";

export const isSoundOn = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable: the preference just won't persist.
  }
}

/**
 * Browsers block vibration and audio until the user has interacted with the page, and log
 * an error for each attempt. Automatic events (the 00:00 UTC distribution) must skip them.
 */
const hasInteracted = (): boolean => {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return activation ? activation.hasBeenActive : true;
};

type AudioCtor = typeof AudioContext;
let context: AudioContext | null = null;

const NOTES = { collect: [880, 1318.5], allocate: [659.25, 987.77, 1318.5] } as const;

/** A short two- or three-note chime. Silent when muted, and quietly skipped where audio is unavailable. */
export function playChime(kind: keyof typeof NOTES = "collect"): void {
  if (!isSoundOn() || !hasInteracted()) return;
  try {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    const ctx = context;
    const start = ctx.currentTime;
    NOTES[kind].forEach((frequency, i) => {
      const at = start + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.06, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
  } catch {
    // Autoplay policy or no audio device: feedback is optional.
  }
}

/** Short vibration on devices that support it. */
export function haptic(pattern: number | number[] = 14): void {
  if (!hasInteracted()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported.
  }
}
