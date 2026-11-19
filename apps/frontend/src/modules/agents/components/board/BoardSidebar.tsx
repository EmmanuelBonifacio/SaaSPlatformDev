"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SquarePen } from "lucide-react";
import { useAgentsBasePath } from "../../hooks/useAgentsBasePath";
import { useBoardBadges } from "../../hooks/useBoardBadges";
import {
  BOARD_AGENTS_NAV,
  BOARD_COMPANY_NAV,
  BOARD_TOP_NAV,
  BOARD_WORK_NAV,
  isBoardNavActive,
} from "../../lib/board-nav";
import { BoardNavItem } from "./BoardNavItem";
import { BoardSection } from "./BoardSection";
import { NewTaskDialog } from "./NewTaskDialog";

type Props = {
  onNavigate?: () => void;
};

export function BoardSidebar({ onNavigate }: Props) {
  const base = useAgentsBasePath();
  const pathname = usePathname() ?? "";
  const badges = useBoardBadges();
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  function badgeFor(
    key?: "inbox" | "approvals" | "live",
  ): number | undefined {
    if (key === "inbox") return badges.inbox;
    if (key === "approvals") return badges.approvals;
    if (key === "live") return badges.live || undefined;
    return undefined;
  }

  return (
    <aside className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-border bg-muted/40">
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <span className="truncate text-sm font-semibold tracking-tight">
          Painel de agentes
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-2">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setNewTaskOpen(true)}
            className="mx-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[length:var(--agents-text-compact)] font-medium text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">Nova tarefa</span>
          </button>
          {BOARD_TOP_NAV.map((item) => (
            <BoardNavItem
              key={item.href || "dashboard"}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              badge={badgeFor(item.badgeKey)}
              active={isBoardNavActive(
                pathname,
                base,
                item.href,
                item.match,
              )}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <BoardSection label="Trabalho">
          {BOARD_WORK_NAV.map((item) => (
            <BoardNavItem
              key={item.href}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              active={isBoardNavActive(
                pathname,
                base,
                item.href,
                item.match,
              )}
              onNavigate={onNavigate}
            />
          ))}
        </BoardSection>

        <BoardSection label="Agentes">
          {BOARD_AGENTS_NAV.map((item) => (
            <BoardNavItem
              key={item.href}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              active={isBoardNavActive(
                pathname,
                base,
                item.href,
                item.match,
              )}
              onNavigate={onNavigate}
            />
          ))}
        </BoardSection>

        <BoardSection label="Empresa">
          {BOARD_COMPANY_NAV.map((item) => (
            <BoardNavItem
              key={item.href}
              href={`${base}${item.href}`}
              label={item.label}
              icon={item.icon}
              badge={badgeFor(item.badgeKey)}
              active={isBoardNavActive(
                pathname,
                base,
                item.href,
                item.match,
              )}
              onNavigate={onNavigate}
            />
          ))}
        </BoardSection>
      </nav>

      <NewTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </aside>
  );
}
