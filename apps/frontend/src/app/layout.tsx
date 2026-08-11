// =============================================================================
// src/app/layout.tsx
// =============================================================================
// O QUE FAZ:
//   Layout raiz do Next.js App Router. Configura a fonte Inter, metadata SEO
//   e envolve toda a aplicação. É o único lugar onde <html> e <body> são
//   renderizados.
// =============================================================================

import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/components/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SaaS Multitenant",
    // Páginas filhas podem setar: export const metadata = { title: "TV Digital" }
    // e o resultado será: "TV Digital | SaaS Multitenant"
    template: "%s | SaaS Multitenant",
  },
  description:
    "Sistema de gestão multitenant com módulos de TV, Estoque e Financeiro.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={cn("overflow-x-hidden")}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning evita warnings causados por extensões do browser */}
      <body
        className={cn(
          "min-h-screen overflow-x-hidden font-sans antialiased bg-background text-foreground",
        )}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
