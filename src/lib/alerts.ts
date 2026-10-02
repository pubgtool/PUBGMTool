import { relativeAge } from "@/lib/nodes";
import type { AppNotification } from "@/types/domain";

export type AlertCategory = "rewards" | "security" | "system";

export const ALERT_CATEGORIES: ReadonlyArray<{ id: AlertCategory; label: string }> = [
  { id: "rewards", label: "Rewards" },
  { id: "security", label: "Security" },
  { id: "system", label: "System" },
];

export function categoryOf(n: Pick<AppNotification, "kind" | "title">): AlertCategory {
  if (n.kind === "account") return "security";
  if (n.kind === "wallet") return /deposit|withdraw/i.test(n.title) ? "system" : "rewards";
  if (n.kind === "stake") return "rewards";
  return "system";
}

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dayKey = (ms: number) => new Date(ms).toDateString();

export function dayLabel(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (dayKey(at) === dayKey(now)) return "Today";
  if (dayKey(at) === dayKey(now - 86_400_000)) return "Yesterday";
  return dayFmt.format(new Date(at));
}

export function groupByDay<T extends { createdAt: string }>(items: readonly T[], now: number): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "5m ago" for fresh alerts, the clock time once they are more than a day old. */
export function ageLabel(iso: string, now: number): string {
  const age = now - Date.parse(iso);
  return age < 86_400_000 ? relativeAge(age) : timeFmt.format(new Date(iso));
}
