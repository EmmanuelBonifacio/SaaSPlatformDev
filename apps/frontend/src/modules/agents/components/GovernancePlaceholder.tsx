"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentsBasePath } from "../hooks/useAgentsBasePath";

type Props = {
  title: string;
  summary: string;
};

/**
 * Placeholder honesto para superfícies Paperclip sem API nativa ainda.
 */
export function GovernancePlaceholder({ title, summary }: Props) {
  const base = useAgentsBasePath();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Card>
        <CardHeader>
          <CardTitle>Indisponível na API V1</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{summary}</p>
          <p>
            Esta rota existe no shell para paridade de navegação. Persistência /
            endpoints nativos exigem fase de schema/API separada — sem inventar
            DDL aqui e sem DROP de <code>paperclip_*</code>.
          </p>
          <Link href={`${base}/settings`} className="text-primary hover:underline">
            Ver Settings do módulo
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
