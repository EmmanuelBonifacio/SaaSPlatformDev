"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WA = "https://wa.me/5538997330921";

const LOGO_PATHS = [
  "/landing/LogoSaaSPlatform.png",
  "/landing/logo-saasplatform.svg",
];

const MODULES = [
  {
    id: "finia",
    title: "FinIA",
    desc: "Assistente financeiro pessoal via WhatsApp, com categorias, contas e dívidas assistidas por IA.",
  },
  {
    id: "paperclip",
    title: "Agentes de IA",
    desc: "Paperclip integrado ao SaaS: agentes, tarefas e conversas no contexto do seu tenant.",
  },
  {
    id: "memory",
    title: "Memória",
    desc: "Memórias aprovadas e isoladas por usuário/tenant para contexto contínuo dos agentes.",
  },
];

function LogoMark({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_PATHS[Math.min(i, LOGO_PATHS.length - 1)]}
        alt="SaaSPlatform"
        className="h-10 w-auto object-contain sm:h-14"
        onError={() => setI((n) => (n < LOGO_PATHS.length - 1 ? n + 1 : n))}
      />
    </div>
  );
}

function WAButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href={WA}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.03] hover:bg-[#20bd5a]",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function SaasPlatformLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden text-white"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.18), transparent 55%), linear-gradient(180deg, #07111f 0%, #0b1a2a 45%, #10233a 100%)",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <nav
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-cyan-500/15 px-6 py-4 backdrop-blur-xl transition-all md:px-10",
          scrolled ? "bg-[#07111f]/95 py-3" : "bg-[#07111f]/70",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight text-cyan-100">
            SaaSPlatform
          </span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#modulos" className="text-sm text-slate-300 hover:text-cyan-300">
            Módulos
          </a>
          <a href="#contato" className="text-sm text-slate-300 hover:text-cyan-300">
            Contato
          </a>
        </div>
        <WAButton className="px-4 py-2 text-xs sm:px-6 sm:py-3 sm:text-sm">
          Fale Conosco
        </WAButton>
      </nav>

      <section className="relative z-10 flex min-h-screen items-end px-6 pb-24 pt-36 md:items-center md:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative z-10 w-full max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            SaaSPlatform
          </p>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Operação multi-tenant com IA no centro.
          </h1>
          <p className="mb-8 max-w-xl text-lg text-slate-300">
            FinIA, agentes Paperclip e memória isolada por tenant — em um núcleo
            Fastify + Next.js com schema PostgreSQL separado por cliente.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#modulos"
              className="inline-flex rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              Ver módulos
            </a>
            <WAButton>Falar no WhatsApp</WAButton>
          </div>
        </div>
      </section>

      <section id="modulos" className="relative z-10 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Módulos ativos
          </h2>
          <p className="mb-10 max-w-2xl text-slate-300">
            O checkout atual entrega estes módulos, com isolamento por schema
            PostgreSQL por tenant.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.id}
                className="border-t border-cyan-400/40 pt-5"
              >
                <h3 className="mb-2 text-xl font-bold text-cyan-100">{m.title}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="relative z-10 px-6 py-16 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 border-t border-white/10 pt-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Pronto para começar?</h2>
            <p className="mt-2 text-slate-300">
              Fale conosco e provisionamos o tenant com os módulos do seu plano.
            </p>
          </div>
          <WAButton>Conversar agora</WAButton>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-slate-500 md:px-10">
        © {new Date().getFullYear()} SaaSPlatform — multi-tenant base
      </footer>
    </div>
  );
}
