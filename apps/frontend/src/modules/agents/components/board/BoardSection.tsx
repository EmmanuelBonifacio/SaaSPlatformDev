"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function BoardSection({ label, children, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group/sidebar-section mx-1 flex items-center gap-1 px-2 py-1 text-left"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="agents-section-label">{label}</span>
      </button>
      {open ? <div className="flex flex-col gap-0.5">{children}</div> : null}
    </div>
  );
}
