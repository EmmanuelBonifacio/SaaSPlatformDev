"use client";

import { useCallback, useEffect, useState } from "react";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";

type Badges = { inbox: number; approvals: number; live: number };

export function useBoardBadges(): Badges {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [badges, setBadges] = useState<Badges>({
    inbox: 0,
    approvals: 0,
    live: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const [tasks, live] = await Promise.all([
        agentsApiService.listTasks(),
        agentsApiService.getLiveDashboard(),
      ]);
      const attention = tasks.filter(
        (t) => t.status === "blocked" || t.status === "in_progress",
      ).length;
      let pending = 0;
      if (isAdmin) {
        const approvals = await agentsApiService.listApprovals({
          status: "pending",
          limit: 50,
        });
        pending = approvals.length;
      }
      const liveCount = live.counts.running + live.counts.queued;
      setBadges({
        inbox: attention + pending + live.counts.running,
        approvals: pending,
        live: liveCount,
      });
    } catch {
      // badges are best-effort; keep last known
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return badges;
}
