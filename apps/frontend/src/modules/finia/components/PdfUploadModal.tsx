"use client";

import React, { useState } from "react";
import { finiaApiService } from "@/services/finia.service";

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PdfUploadModal({ isOpen, onClose, onSuccess }: PdfUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await finiaApiService.uploadPdfExtrato(file);
      setMessage(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage("Erro ao processar PDF: " + (err.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        <h3 className="text-xl font-bold text-foreground mb-2">Upload de Extrato PDF</h3>
        <p className="text-sm text-muted-foreground mb-6">
          O Claude 3.5 Sonnet Vision irá ler o extrato, categorizar e lançar as movimentações automaticamente.
        </p>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 mb-4 cursor-pointer"
        />

        {message && (
          <div className="p-3 mb-4 rounded-xl text-sm bg-muted text-foreground border border-border">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!file || loading}
            onClick={handleUpload}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />}
            {loading ? "Processando com IA..." : "Enviar Extrato"}
          </button>
        </div>
      </div>
    </div>
  );
}
