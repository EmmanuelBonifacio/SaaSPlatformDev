"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CircleDot,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentsBasePath } from "../../hooks/useAgentsBasePath";
import { isBoardNavActive } from "../../lib/board-nav";

const MOBILE = [
  { href: "", label: "Início", icon: LayoutDashboard, match: "exact" as const },
  { href: "/chats", label: "Chat", icon: MessagesSquare, match: "prefix" as const },
  { href: "/tasks", label: "Tarefas", icon: CircleDot, match: "prefix" as const },
  { href: "/list", label: "Agentes", icon: Bot, match: "prefix" as const },
  { href: "/inbox", label: "Caixa de entrada", icon: Inbox, match: "prefix" as const },
];

export function BoardMobileNav() {
  const base = useAgentsBasePath();
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Agentes (mobile)"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MOBILE.map((item) => {
        const active = isBoardNavActive(
          pathname,
          base,
          item.href,
          item.match,
        );
        const Icon = item.icon;
        return (
          <Link
            key={item.href || "home"}
            href={`${base}${item.href}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
