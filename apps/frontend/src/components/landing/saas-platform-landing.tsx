"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LandingImage } from "./landing-image";

const WA = "https://wa.me/5538997330921";

const VENDAS_IMGS = [
  "/landing/catalogovendas1.jpg",
  "/landing/catalogovendas2.jpg",
  "/landing/catalogovendas3.jpg",
  "/landing/catalogovendas4.jpg",
  "/landing/catalogovendas5.jpg",
];

const FROTA_IMGS = [
  "/landing/frota1.jpg",
  "/landing/frota2.jpg",
  "/landing/frota3.jpg",
  "/landing/frota4.jpg",
  "/landing/frota5.jpg",
  "/landing/frota6.jpg",
  "/landing/frota7.jpg",
];

const LOGO_PATHS = [
  "/landing/LogoSaaSPlatform.png",
  "/landing/logo-saasplatform.svg",
  "/landing/logo.png",
];

/* ─── Particles ─── */
function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      a: Math.random() * 0.6 + 0.1,
      c: Math.random() > 0.6 ? "#4c2aff" : Math.random() > 0.5 ? "#00d4ff" : "#ffffff",
    }));

    let raf: number;

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.c;
        ctx!.globalAlpha = p.a;
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(108,63,255,${0.15 * (1 - d / 100)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    draw();
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}

/* ─── Logo ─── */
function LogoMark({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  return (
    <div className={cn("flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_PATHS[Math.min(i, LOGO_PATHS.length - 1)]}
        alt="SaaSPlatform"
        className="h-10 w-auto object-contain sm:h-14"
        style={{
          filter:
            "drop-shadow(0 0 10px rgba(108,63,255,0.9)) drop-shadow(0 0 24px rgba(0,212,255,0.5)) brightness(1.15)",
        }}
        onError={() => setI((n) => (n < LOGO_PATHS.length - 1 ? n + 1 : n))}
      />
    </div>
  );
}

/* ─── WhatsApp button ─── */
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
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      <span className="whitespace-nowrap">{children}</span>
    </a>
  );
}

/* ─── Screenshot gallery ─── */
function Gallery({ imgs, accent }: { imgs: string[]; accent: "violet" | "orange" }) {
  const [idx, setIdx] = useState(0);
  const border = accent === "violet" ? "border-violet-500/40" : "border-orange-500/40";
  const activeBorder = accent === "violet" ? "border-violet-400 shadow-violet-500/30" : "border-orange-400 shadow-orange-500/30";

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* main */}
      <div className={cn("overflow-hidden rounded-2xl border", border)}>
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#110d2e] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-2 text-xs text-white/30">SaaSPlatform</span>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <LandingImage
            paths={[imgs[idx]]}
            alt="screenshot"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </div>
      </div>
      {/* thumbs */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {imgs.map((src, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              "shrink-0 overflow-hidden rounded-lg border transition-all duration-200",
              i === idx ? cn("opacity-100 shadow-lg", activeBorder) : "border-white/10 opacity-50 hover:opacity-80",
            )}
            style={{ width: 80 }}
          >
            <div className="relative h-12 w-full overflow-hidden">
              <LandingImage
                paths={[src]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Glow divider ─── */
function GlowDivider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export function SaasPlatformLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll(".sr");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("sr-in"); obs.unobserve(e.target); } }),
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden text-white"
      style={{ background: "#04051a", fontFamily: "var(--font-inter), ui-sans-serif, sans-serif", overflowX: "hidden" }}
    >
      <style>{`
        @keyframes floatCube {
          0%{transform:translateY(0) rotate(0deg);opacity:.4}
          25%{transform:translateY(-20px) rotate(90deg);opacity:.7}
          50%{transform:translateY(-10px) rotate(180deg);opacity:.5}
          75%{transform:translateY(-30px) rotate(270deg);opacity:.8}
          100%{transform:translateY(0) rotate(360deg);opacity:.4}
        }
        @keyframes orbFloat {
          0%,100%{transform:translate(0,0)}
          33%{transform:translate(30px,-20px)}
          66%{transform:translate(-20px,15px)}
        }
        @keyframes pulseDot {
          0%,100%{transform:scale(1);opacity:1}
          50%{transform:scale(1.5);opacity:.6}
        }
        .sr { opacity:0; transform:translateY(40px); transition:all 0.7s ease; }
        .sr-in { opacity:1; transform:translateY(0); }
        .cube {
          position:absolute; border-radius:8px;
          border:1px solid rgba(108,63,255,0.35);
          background:rgba(108,63,255,0.07);
          backdrop-filter:blur(4px);
          animation:floatCube linear infinite;
        }
      `}</style>

      <ParticlesCanvas />

      {/* ── NAVBAR ── */}
      <nav
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-violet-500/20 px-6 py-4 backdrop-blur-xl transition-all duration-300 md:px-10",
          scrolled ? "bg-[#04051a]/97 py-3 shadow-lg shadow-violet-900/20" : "bg-[#04051a]/85",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <LogoMark />
          <span className="hidden bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:block">
            SaaSPlatform
          </span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {[["#modulos","Módulos"],["#vendas","Catálogo"],["#frota","Gestão de Frota"],["#contato","Contato"]].map(([href, label]) => (
            <a key={href} href={href} className="text-sm font-medium text-slate-400 transition-colors hover:text-cyan-400">
              {label}
            </a>
          ))}
        </div>
        <WAButton className="shrink-0 px-4 py-2 text-xs sm:px-6 sm:py-3 sm:text-sm">Fale Conosco</WAButton>
      </nav>

      {/* ── HERO ── */}
      <section
        id="home"
        className="relative z-10 flex min-h-screen items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(76,42,255,0.22) 0%, transparent 70%)" }}
      >
        {/* orbs — ficam dentro do overflow:hidden da section */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full blur-[80px] sm:h-96 sm:w-96" style={{ background: "rgba(108,63,255,0.15)", animation: "orbFloat 8s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-12 -right-20 h-56 w-56 rounded-full blur-[80px] sm:h-72 sm:w-72" style={{ background: "rgba(0,212,255,0.1)", animation: "orbFloat 8s ease-in-out infinite 3s" }} />

        {/* floating cubes */}
        {[
          { left:"8%", top:"22%", width:30, height:30, animationDuration:"8s", animationDelay:"0s", borderColor:"rgba(0,212,255,0.3)", background:"rgba(0,212,255,0.07)" },
          { left:"14%", top:"68%", width:48, height:48, animationDuration:"10s", animationDelay:"2s" },
          { right:"9%", top:"24%", width:34, height:34, animationDuration:"7s", animationDelay:"1s", borderColor:"rgba(255,60,172,0.3)", background:"rgba(255,60,172,0.07)" },
          { right:"17%", top:"66%", width:24, height:24, animationDuration:"9s", animationDelay:"3s", borderColor:"rgba(0,212,255,0.3)", background:"rgba(0,212,255,0.07)" },
          { left:"29%", top:"82%", width:44, height:44, animationDuration:"11s", animationDelay:"1.5s", borderColor:"rgba(255,140,0,0.3)", background:"rgba(255,140,0,0.07)" },
        ].map((s, i) => (
          <div key={i} className="cube" style={s as React.CSSProperties} />
        ))}

        <div className="relative z-10 w-full max-w-4xl">
          {/* badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" style={{ animation: "pulseDot 2s infinite" }} />
            Desenvolvimento Sob Medida
          </div>

          <h1 className="mb-6 text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-7xl lg:text-8xl">
            Soluções{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Inteligentes
            </span>
            <br />
            para o seu{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Negócio!
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            Criamos sistemas personalizados para empresas, transformando suas operações em resultados eficientes e escaláveis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#vendas"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-violet-900/40 transition-all hover:-translate-y-1 hover:shadow-violet-600/50"
            >
              🛒 Ver Módulos
            </a>
            <WAButton className="px-8 py-4 text-base">
              💬 Fale no WhatsApp
            </WAButton>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="sr relative z-10 overflow-x-hidden px-6 md:px-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-violet-500/20 bg-white/[0.03] p-8 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-around gap-6">
            {[["100%","Sob Medida"],["2+","Módulos Ativos"],["24/7","Suporte"],["Fast","Deploy Rápido"]].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent">{n}</div>
                <div className="mt-1 text-sm text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GlowDivider />

      {/* ── MÓDULOS OVERVIEW ── */}
      <section
        id="modulos"
        className="relative z-10 overflow-x-hidden px-6 py-24 md:px-10"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(76,42,255,0.12) 0%, transparent 70%)" }}
      >
        <div className="sr mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
            ⚡ Nossos Módulos
          </div>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Soluções que{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Transformam</span>{" "}
            seu Negócio
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            Cada módulo foi desenvolvido para resolver problemas reais com tecnologia moderna e interface intuitiva.
          </p>
        </div>

        <div className="sr mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
          {[
            { icon: "🛒", title: "Catálogo de Vendas", desc: "Venda online com catálogo integrado ao WhatsApp. Gerencie produtos, pedidos e configure sua loja em minutos.", href: "#vendas", gradient: "from-violet-600 to-indigo-600", glow: "rgba(108,63,255,0.3)" },
            { icon: "🚚", title: "Gestão de Frota", desc: "Rastreamento em tempo real, gestão de motoristas, criação de rotas otimizadas e controle de manutenção.", href: "#frota", gradient: "from-orange-500 to-red-500", glow: "rgba(255,140,0,0.3)" },
          ].map((m) => (
            <div
              key={m.title}
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-9 transition-all duration-300 hover:-translate-y-2 hover:border-white/20 hover:bg-white/[0.06]"
              style={{ boxShadow: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 20px 60px ${m.glow}`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div className={cn("mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl", m.gradient)}>
                {m.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold">{m.title}</h3>
              <p className="mb-6 text-sm leading-relaxed text-slate-400">{m.desc}</p>
              <a
                href={m.href}
                className={cn("inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90", m.gradient)}
              >
                Saiba Mais →
              </a>
            </div>
          ))}
        </div>
      </section>

      <GlowDivider />

      {/* ── COMO TRABALHAMOS ── */}
      <section className="relative z-10 overflow-x-hidden px-6 py-24 text-center md:px-10">
        <div className="sr mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
            🔧 Como Trabalhamos
          </div>
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-5xl">
            Desenvolvimento de Soluções para o seu{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Negócio</span>
          </h2>
          <p className="text-lg text-slate-400">
            Criamos sistemas personalizados para empresas, visando otimizar seus processos e garantir resultados eficientes e escaláveis.
          </p>
        </div>

        <div className="sr mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["⚙️","Desenvolvimento Sob Medida","Cada sistema é criado de acordo com as necessidades específicas do seu negócio."],
            ["🚀","Deploy Rápido","Entregamos soluções funcionais em tempo recorde com infraestrutura moderna na nuvem."],
            ["📊","Dados em Tempo Real","Painéis com métricas atualizadas para decisões baseadas em dados concretos."],
            ["🔒","Segurança Total","Arquitetura multi-tenant com isolamento de dados e autenticação robusta."],
            ["📱","Mobile First","Interface responsiva e otimizada para todos os dispositivos."],
            ["🤝","Suporte Dedicado","Acompanhamento contínuo e suporte direto via WhatsApp."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="rounded-2xl border border-white/7 bg-white/[0.03] p-7 text-left transition-all hover:-translate-y-1 hover:border-violet-500/30 hover:bg-violet-500/[0.08]">
              <div className="mb-4 text-3xl">{icon}</div>
              <h4 className="mb-2 font-bold">{title}</h4>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <GlowDivider />

      {/* ── MÓDULO VENDAS ── */}
      <section
        id="vendas"
        className="relative z-10 overflow-x-hidden px-6 py-14 sm:py-24 md:px-10"
        style={{ background: "radial-gradient(ellipse 60% 50% at 30% 50%, rgba(108,63,255,0.1) 0%, transparent 70%)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:gap-16 lg:grid-cols-2 lg:items-center">
          {/* info */}
          <div className="sr min-w-0 overflow-hidden">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
              🛒 Módulo de Vendas
            </div>
            <h2 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-5xl">
              Catálogo de Vendas{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Integrado ao WhatsApp
              </span>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-slate-400 sm:text-lg">
              Facilite e aumente suas vendas online. Exiba produtos em catálogo direto pelo WhatsApp, finalize pedidos rapidamente e gerencie suas vendas com módulos de administração dedicados.
            </p>
            <ul className="mb-8 space-y-2.5">
              {[
                "Catálogo público com checkout direto via WhatsApp",
                "Painel admin com métricas de pedidos em tempo real",
                "Gestão de produtos por unidade ou quilo (balança)",
                "Categorias personalizadas e preços promocionais",
                "Configuração de logo, nome e WhatsApp da loja",
                "Dashboard com total de pedidos, valor e produtos",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 border-b border-white/5 pb-2.5 text-sm text-slate-200 last:border-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold">✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <WAButton className="w-full justify-center py-4 text-base sm:w-auto sm:px-8">💬 Solicitar Demonstração</WAButton>
          </div>
          {/* gallery */}
          <div className="sr min-w-0 overflow-hidden">
            <Gallery imgs={VENDAS_IMGS} accent="violet" />
          </div>
        </div>
      </section>

      <GlowDivider />

      {/* ── MÓDULO FROTA ── */}
      <section
        id="frota"
        className="relative z-10 overflow-x-hidden px-6 py-14 sm:py-24 md:px-10"
        style={{ background: "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(255,140,0,0.07) 0%, transparent 70%)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:gap-16 lg:grid-cols-2 lg:items-center">
          {/* gallery — aparece abaixo do texto no mobile */}
          <div className="sr order-2 min-w-0 overflow-hidden lg:order-1">
            <Gallery imgs={FROTA_IMGS} accent="orange" />
          </div>
          {/* info */}
          <div className="sr order-1 min-w-0 overflow-hidden lg:order-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-400">
              🚚 Gestão de Frota
            </div>
            <h2 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-5xl">
              Gestão de Frota{" "}
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Inteligente
              </span>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-slate-400 sm:text-lg">
              Controle total de veículos, motoristas, rotas e manutenção em um painel intuitivo e eficiente. Rastreamento GPS em tempo real com despacho integrado.
            </p>
            <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["📍","Monitoramento em Tempo Real"],
                ["🗺️","Otimização de Rotas"],
                ["👤","Gestão de Motoristas"],
                ["🔧","Controle de Manutenção"],
                ["📋","Despacho Kanban"],
                ["⛽","Controle de Combustível"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3 text-sm transition-all hover:border-orange-500/40 hover:bg-orange-500/10">
                  <span className="text-lg">{icon}</span>
                  <span className="text-slate-200">{label}</span>
                </div>
              ))}
            </div>
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-900/30 transition-all hover:-translate-y-1 hover:shadow-orange-600/40 sm:w-auto"
            >
              🚚 Solicitar Demonstração
            </a>
          </div>
        </div>
      </section>

      <GlowDivider />

      {/* ── FOOTER ── */}
      <footer id="contato" className="relative z-10 overflow-x-hidden border-t border-violet-500/20 bg-[#04051a]/95 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 flex flex-wrap items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark />
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                  SaaSPlatform
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Soluções sob medida para o seu negócio</p>
            </div>
            <div className="flex gap-4">
              {[
                {
                  href: WA,
                  hc: "#25d366",
                  svg: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25d366]" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
                },
                {
                  href: "https://instagram.com/saasplatformdev",
                  hc: "#e1306c",
                  svg: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#e1306c]" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
                },
                {
                  href: "mailto:saasplatformdev@gmail.com",
                  hc: "#00d4ff",
                  svg: <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#00d4ff]" aria-hidden><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>,
                },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-1"
                  style={{ transition: "all 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.hc; e.currentTarget.style.boxShadow = `0 0 20px ${s.hc}55`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = ""; }}
                >
                  {s.svg}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
            <p className="text-sm text-slate-400">© 2025 SaaSPlatform. Todos os direitos reservados.</p>
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-sm font-bold text-transparent">
              Soluções sob medida para o seu negócio ✦
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
