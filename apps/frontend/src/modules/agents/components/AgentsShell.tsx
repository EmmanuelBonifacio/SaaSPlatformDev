"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardMobileNav } from "./board/BoardMobileNav";
import { BoardSidebar } from "./board/BoardSidebar";
import "../styles/agents-board.css";

/**
 * Shell do board agents (paridade visual Paperclip).
 * Auth permanece no layout SaaS `[slug]` — sem login Paperclip.
 */
export function AgentsShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="agents-board flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Open agents menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">Agents</span>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <BoardSidebar />
        </div>

        {mobileOpen ? (
          <div className="absolute inset-0 z-40 flex md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-50 h-full shadow-lg">
              <BoardSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-20 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      <BoardMobileNav />
    </div>
  );
}
