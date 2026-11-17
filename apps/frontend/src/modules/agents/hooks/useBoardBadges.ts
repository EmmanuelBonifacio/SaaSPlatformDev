"use client";

import { useCallback, useEffect, useState } from "react";
import { agentsApiService } from "@/services/agents.service";
import { useAuth } from "@/hooks/useAuth";

type Badges = { inbox: number; approvals: number };

export function useBoardBadges(): Badges {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [badges, setBadges] = useState<Badges>({ inbox: 0, approvals: 0 });

  const refresh = useCallback(async () => {
    try {
      const tasks = await agentsApiService.listTasks();
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
      setBadges({ inbox: attention + pending, approvals: pending });
    } catch {
      // badges are best-effort; keep last known
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return badges;
}
