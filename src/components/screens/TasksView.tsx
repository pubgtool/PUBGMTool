"use client";

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { CheckInGrid } from "@/components/screens/tasks/CheckInGrid";
import { EnvelopeVault } from "@/components/screens/tasks/EnvelopeVault";
import { MissionsList } from "@/components/screens/tasks/MissionsList";
import { RewardsHero } from "@/components/screens/tasks/RewardsHero";
import { toast } from "@/components/ui/Toast";
import { COMMUNITY, TASKS, type TaskDef } from "@/config/rewards";
import { formatAmount } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { checkInView, computeTaskBonus, taskView, type TaskView } from "@/lib/rewards";
import { useAppStore } from "@/lib/store";
import { msUntilNextUtcDay } from "@/lib/time";

export function TasksView() {
  const user = useAppStore((s) => s.user);
  const positions = useAppStore((s) => s.positions);
  const checkIn = useAppStore((s) => s.checkIn);
  const startTask = useAppStore((s) => s.startTask);
  const claimTask = useAppStore((s) => s.claimTask);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [burstKey, setBurstKey] = useState(0);
  const [popDay, setPopDay] = useState<number | null>(null);

  const { rewards } = user;
  const guest = user.isGuest;

  // Tick fast only while a mission is counting down; otherwise once a second is enough.
  const inFlight = TASKS.some((t) => {
    const p = rewards.tasks[t.id];
    return p?.startedAt != null && p.claimedAt == null;
  });
  const now = useNow(inFlight ? 250 : 1_000);

  const hasActivePlan = positions.some((p) => p.status === "active");
  const computeReward = useMemo(() => computeTaskBonus(positions), [positions]);

  const views = useMemo(() => {
    const ctx = { now, hasActivePlan, invites: user.referral.invites, computeReward };
    return Object.fromEntries(TASKS.map((def) => [def.id, taskView(def, rewards.tasks[def.id], ctx)])) as Record<
      string,
      TaskView
    >;
  }, [now, hasActivePlan, user.referral.invites, computeReward, rewards.tasks]);

  const checkInState = checkInView(rewards.checkIn, now);

  const onCheckIn = () => {
    const result = checkIn();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBurstKey((n) => n + 1);
    setPopDay(result.day ?? null);
    toast.success(
      result.mystery !== undefined
        ? `Day ${result.day} complete: +${formatAmount(result.amount)} USDT incl. ${formatAmount(result.mystery)} mystery bonus`
        : `Day ${result.day} check-in: +${formatAmount(result.amount)} USDT`,
    );
  };

  const onStart = (def: TaskDef) => {
    if (def.id === "telegram") window.open(COMMUNITY.telegramChannelUrl, "_blank", "noopener,noreferrer");
    const result = startTask(def.id);
    if (!result.ok) toast.error(result.error);
    else if (def.kind === "timed") toast.info("Verifying your membership…");
  };

  const onClaim = (def: TaskDef): boolean => {
    const result = claimTask(def.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Bounty claimed: +${formatAmount(result.amount)} USDT`);
    return true;
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-2 px-4 pb-1 pt-5">
        <button
          type="button"
          onClick={() => setActiveTab("main")}
          aria-label="Back to Main"
          className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-600 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks &amp; Rewards</h1>
          <p className="text-xs text-slate-500">Daily check-ins, gift codes and missions</p>
        </div>
      </header>

      <main className="flex flex-col gap-4 px-4 pb-4 pt-3">
        <RewardsHero totalBounty={rewards.totalBounty} claimed={checkInState.claimed} />
        <CheckInGrid
          view={checkInState}
          guest={guest}
          resetInMs={msUntilNextUtcDay(now)}
          burstKey={burstKey}
          popDay={popDay}
          onCheckIn={onCheckIn}
        />
        <EnvelopeVault guest={guest} />
        <MissionsList
          views={views}
          guest={guest}
          invites={user.referral.invites}
          onStart={onStart}
          onClaim={onClaim}
          onInvite={() => setActiveTab("profile")}
          onGetPlan={() => setActiveTab("vaults")}
        />
        <p className="px-1 text-center text-[11px] text-slate-400">
          Sandbox: mission verification is simulated. Rewards are mock balances.
        </p>
      </main>
    </div>
  );
}
