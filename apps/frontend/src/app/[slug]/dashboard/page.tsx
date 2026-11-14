"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Bot,
  Brain,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useModules } from "@/hooks/useModules";
import { useAuth } from "@/hooks/useAuth";

const MODULE_CARDS = {
  finia: {
    icon: Sparkles,
    title: "FinIA",
    description:
      "Assistente financeiro pessoal via WhatsApp com IA.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  paperclip: {
    icon: Bot,
    title: "Agentes de IA",
    description:
      "Acompanhe agentes e tarefas e converse com eles pelo SaaS.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  memory: {
    icon: Brain,
    title: "Memória",
    description:
      "Memórias isoladas por usuário e tenant para os agentes.",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    href: "memoria",
  },
};

export default function DashboardPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { modules, isLoading } = useModules();
  const { user } = useAuth();
  const userName = user?.name ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo{userName ? `, ${userName}` : ""}! Escolha um módulo para
          gerenciar.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32 mt-3" />
                <Skeleton className="h-4 w-full mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutDashboard className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-30" />
            <p className="font-medium text-muted-foreground">
              Nenhum módulo ativo para este tenant.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Entre no painel admin para ativar módulos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.flatMap((mod) => {
            const meta = MODULE_CARDS[mod.name as keyof typeof MODULE_CARDS];
            if (!meta) return [];
            const href = `/${slug}/${"href" in meta && meta.href ? meta.href : mod.name}`;
            const Icon = meta.icon;
            return [
              <Card key={mod.name} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div
                    className={`h-10 w-10 rounded-lg ${meta.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <CardTitle className="mt-3 text-base">{meta.title}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={href}>
                      Acessar
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>,
            ];
          })}
        </div>
      )}
    </div>
  );
}
