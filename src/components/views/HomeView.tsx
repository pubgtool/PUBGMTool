"use client";

import { ActionMatrix } from "@/components/home/ActionMatrix";
import { NoticeTicker } from "@/components/home/NoticeTicker";
import { PoolList } from "@/components/home/PoolList";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { SettlementFeed } from "@/components/home/SettlementFeed";
import { TopBar } from "@/components/home/TopBar";

export function HomeView() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
      <TopBar />
      <PromoCarousel />
      <NoticeTicker />
      <ActionMatrix />
      <PoolList />
      <SettlementFeed />
    </main>
  );
}
