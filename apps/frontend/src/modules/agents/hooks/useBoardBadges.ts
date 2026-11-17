"use client";

import { useCallback, useEffect, useState } from "react";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";
import { useAgentsLiveSocket } from "./useAgentsLiveSocket";

type Badges = { inbox: number; approvals: number; live: number };

export function useBoardBadges(): Badges {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [attention, setAttention] = useState(0);
  const [pending, setPending] = useState(0);
  const [fallbackLive, setFallbackLive] = useState(0);

  const refreshStatic = useCallback(async () => {
    try {
      const [tasks, liveDash] = await Promise.all([
        agentsApiService.listTasks(),
        agentsApiService.getLiveDashboard(),
      ]);
      setAttention(
        tasks.filter(
          (t) => t.status === "blocked" || t.status === "in_progress",
        ).length,
      );
      setFallbackLive(liveDash.counts.running + liveDash.counts.queued);
      if (isAdmin) {
        const approvals = await agentsApiService.listApprovals({
          status: "pending",
          limit: 50,
        });
        setPending(approvals.length);
      } else {
        setPending(0);
      }
    } catch {
      // badges are best-effort; keep last known
    }
  }, [isAdmin]);

  const { live } = useAgentsLiveSocket();

  useEffect(() => {
    void refreshStatic();
    const timer = setInterval(() => void refreshStatic(), 30_000);
    return () => clearInterval(timer);
  }, [refreshStatic]);

  const liveCount = live
    ? live.counts.running + live.counts.queued
    : fallbackLive;
  const running = live?.counts.running ?? 0;

  return {
    inbox: attention + pending + running,
    approvals: pending,
    live: liveCount,
  };
}
