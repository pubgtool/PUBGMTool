import type { UserProfile } from "@/types/domain";

/** Loyalty points are a read-only tally of what the account has done; they carry no cash value. */
export const POINTS = { welcome: 20, checkIn: 5, mission: 10, invite: 25 } as const;

export function accountPoints(user: Pick<UserProfile, "isGuest" | "rewards" | "referral">): number {
  if (user.isGuest) return 0;
  const { checkIn, tasks } = user.rewards;
  const checkIns = checkIn.cycles * 7 + checkIn.streak;
  const missions = Object.values(tasks).filter((task) => task?.claimedAt).length;
  return POINTS.welcome + checkIns * POINTS.checkIn + missions * POINTS.mission + user.referral.invites * POINTS.invite;
}
