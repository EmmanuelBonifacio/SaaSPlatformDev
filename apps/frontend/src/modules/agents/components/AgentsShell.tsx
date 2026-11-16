"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";

const NAV = [
  { href: "", label: "Dashboard", match: "exact" as const },
  { href: "/list", label: "Agents", match: "prefix" as const },
  { href: "/tasks", label: "Tasks", match: "prefix" as const },
  { href: "/approvals", label: "Approvals", match: "prefix" as const },
  { href: "/runs", label: "Runs", match: "prefix" as const },
  { href: "/activity", label: "Activity", match: "prefix" as const },
];

function isActive(
  pathname: string,
  base: string,
  href: string,
  match: "exact" | "prefix",
): boolean {
  const target = `${base}${href}`;
  if (match === "exact") {
    return pathname === target || pathname === `${target}/`;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function AgentsShell({ children }: { children: React.ReactNode }) {
  const base = useAgentsBasePath();
  const pathname = usePathname() ?? "";

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="space-y-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-violet-600" />
            Agentes de IA
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel nativo do SaaS. Auth do tenant — sem login Paperclip.
          </p>
        </div>
        <nav
          aria-label="Navegação do módulo agentes"
          className="flex flex-wrap gap-1 border-b border-border pb-px"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, base, item.href, item.match);
            return (
              <Link
                key={item.href || "dashboard"}
                href={`${base}${item.href}`}
                className={cn(
                  "rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
