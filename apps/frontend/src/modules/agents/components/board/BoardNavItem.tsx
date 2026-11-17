"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
};

export function BoardNavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: Props) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "mx-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[length:var(--agents-text-compact)] font-medium transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-foreground/80 hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="rounded-full bg-foreground/90 px-1.5 py-0.5 text-[10px] font-semibold text-background">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
