// =============================================================================
// next.config.mjs
// =============================================================================
// O QUE FAZ:
//   Arquivo de configuração do Next.js (versão ESModule .mjs).
//   O Next.js não suporta next.config.ts — use .mjs ou .js.
//
// ATENÇÃO DE SEGURANÇA:
//   NUNCA coloque segredos (JWT_SECRET, senhas) em variáveis NEXT_PUBLIC.
//   Elas aparecem no bundle JavaScript do cliente e podem ser inspecionadas.
//
// PRODUÇÃO:
//   NEXT_PUBLIC_API_URL deve existir no build (ex: https://api.seudominio.com.br).
//   Sem isso, fotos em /uploads/ viram http://localhost no bundle e quebram na vitrine.
//   Para builds excepcionais: SKIP_PUBLIC_API_URL_CHECK=1
// =============================================================================

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawApi = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const isProdBuild = process.env.NODE_ENV === "production";
const backendInternalUrl = (
  process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

if (
  isProdBuild &&
  !process.env.SKIP_PUBLIC_API_URL_CHECK &&
  (!rawApi ||
    (!rawApi.startsWith("https://") && !rawApi.startsWith("http://")))
) {
  throw new Error(
    "next.config.mjs: em produção, defina NEXT_PUBLIC_API_URL com a URL pública da API " +
      "(ex: https://api.saasplatform.com.br). Sem isso, imagens de produtos apontam para localhost. " +
      "Docker: docker build --build-arg NEXT_PUBLIC_API_URL=https://api...",
  );
}

// Em desenvolvimento, use o proxy same-origin `/backend` para o browser não
// depender de 127.0.0.1:3000 (quebra em port-forward / preview remoto).
const nextPublicApiUrl = rawApi || (isProdBuild ? "" : "/backend");

/** @returns {import('next').NextConfig['images']['remotePatterns']} */
function buildUploadsRemotePatterns() {
  try {
    const u = new URL(
      nextPublicApiUrl.startsWith("http")
        ? nextPublicApiUrl
        : backendInternalUrl,
    );
    return [
      {
        protocol: /** @type {"http" | "https"} */ (
          u.protocol === "https:" ? "https" : "http"
        ),
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/uploads/**",
      },
    ];
  } catch {
    return [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
      { protocol: /** @type {"https"} */ ("https"), hostname: "**" },
    ];
  }
}

// ─── Security headers ─────────────────────────────────────────────────────────
// Aplicados em todas as rotas. CSP usa 'unsafe-inline' e 'unsafe-eval' pois
// o Next.js os exige para hydration e hot reload em dev.
// Em produção: adicionar nonce para 'unsafe-inline' quando possível.
const connectSrcExtras = (() => {
  if (!nextPublicApiUrl.startsWith("http")) {
    return "ws://localhost:* wss://localhost:* http://127.0.0.1:* http://localhost:*";
  }
  const ws = nextPublicApiUrl
    .replace("https://", "wss://")
    .replace("http://", "ws://");
  return `${nextPublicApiUrl} ${ws} ws://localhost:* wss://localhost:*`;
})();

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // necessário para Next.js
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: http:`,
      "font-src 'self'",
      `connect-src 'self' ${connectSrcExtras} https://viacep.com.br https://nominatim.openstreetmap.org`,
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  // HSTS apenas em produção — em dev causaria problemas com HTTP localhost
  ...(isProdBuild
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: evita que o Next infira a raiz errada quando há outros lockfiles.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Necessário para build Docker com Next.js standalone
  output: "standalone",

  env: {
    NEXT_PUBLIC_API_URL: nextPublicApiUrl,
  },

  images: {
    remotePatterns: buildUploadsRemotePatterns(),
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  serverExternalPackages: ["tailwind-merge"],

  // Headers de segurança em todas as rotas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Proxy same-origin → backend interno (dev e preview remoto)
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${backendInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
