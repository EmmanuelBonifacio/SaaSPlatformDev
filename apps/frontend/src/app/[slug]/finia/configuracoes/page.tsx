"use client";

import React, { useState, useEffect } from "react";
import { finiaApiService } from "@/services/finia.service";
import { QrCode, Sparkles, CheckCircle2 } from "lucide-react";

export default function FiniaConfiguracoesPage() {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    finiaApiService
      .getWhatsAppQrCode()
      .then((res) => setQrcode(res.qrcode || null))
      .catch(() => setQrcode(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações do FinIA WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a integração da Evolution API e pareamento do WhatsApp com o Claude 3.5 Sonnet.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Pareamento via QR Code</h3>
            <p className="text-xs text-muted-foreground">Evolution API Container Instance</p>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
            Carregando QR Code...
          </div>
        ) : qrcode ? (
          <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-border">
            <img src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`} alt="QR Code" className="h-64 w-64 object-contain" />
            <p className="text-xs text-slate-600 mt-4 font-medium">Abra o WhatsApp &gt; Dispositivos Conectados &gt; Conectar Dispositivo</p>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-muted/40 text-center border border-dashed border-border space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Instância Evolution API pronta para receber webhooks</p>
            <p className="text-xs text-muted-foreground">As mensagens enviadas para /finia/webhook/whatsapp serão processadas pela IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
