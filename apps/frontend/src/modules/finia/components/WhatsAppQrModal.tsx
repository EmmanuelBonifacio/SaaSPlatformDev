"use client";

import React, { useState, useEffect } from "react";
import { finiaApiService } from "@/services/finia.service";

export function WhatsAppQrModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      finiaApiService
        .getWhatsAppQrCode()
        .then((res) => {
          setQrcode(res.qrcode || null);
        })
        .catch(() => setQrcode(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Conectar WhatsApp FinIA</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Abra o WhatsApp no seu celular, vá em **Dispositivos Conectados** e escaneie o QR Code abaixo.
        </p>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Gerando QR Code via Evolution API...</span>
          </div>
        ) : qrcode ? (
          <div className="flex justify-center p-4 bg-white rounded-2xl border border-border mb-4">
            <img src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`} alt="QR Code WhatsApp" className="h-64 w-64 object-contain" />
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/30 rounded-2xl border border-dashed border-border mb-4">
            <p className="text-sm font-medium">Evolution API desconectada ou em modo simulação local.</p>
            <span className="text-xs text-muted-foreground mt-2">Você pode enviar webhooks diretamente para a API.</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
