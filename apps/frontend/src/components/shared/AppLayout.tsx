"use client";

import { useState } from "react";
import { useModules } from "@/hooks/useModules";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
  tenantSlug: string;
  tenantName?: string;
  pageTitle?: string;
}

export function AppLayout({
  children,
  tenantSlug,
  tenantName,
  pageTitle,
}: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { modules, plano, isLoading: isLoadingModules } = useModules();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex relative">
        <Sidebar
          tenantSlug={tenantSlug}
          modules={modules}
          isLoading={isLoadingModules}
          plano={plano}
        />
      </div>

      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 animate-slide-in">
            <Sidebar
              tenantSlug={tenantSlug}
              modules={modules}
              isLoading={isLoadingModules}
              plano={plano}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          pageTitle={pageTitle ?? ""}
          tenantName={tenantName}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto max-w-7xl p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
