// =============================================================================
// src/modules/finia/finia.evolution.service.ts
// =============================================================================
// Integração com a Evolution API (WhatsApp REST / Webhook / QR Code)
// =============================================================================

import https from "https";
import http from "http";
import { env } from "../../config/env";

const AGENT_HTTPS = new https.Agent({ rejectUnauthorized: false });

export class EvolutionService {
  private get baseUrl(): string {
    return env.EVOLUTION_API_HOST || process.env.EVOLUTION_API_HOST || "http://localhost:8080";
  }

  private get apiKey(): string {
    return env.EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY || "saas_evolution_secret";
  }

  /**
   * Solicita a geração do QR Code de pareamento para a instância do tenant
   */
  async getQrCode(instanceName: string): Promise<{ qrcode?: string; status: string }> {
    try {
      // 1. Tenta conectar à instância existente
      const connectUrl = `${this.baseUrl}/instance/connect/${instanceName}`;
      const resConnect = await this.httpRequest(connectUrl, "GET");

      const qrcode = resConnect?.base64 || resConnect?.code || resConnect?.qrcode?.base64;
      if (qrcode) {
        return {
          qrcode,
          status: resConnect?.instance?.state || "connecting",
        };
      }

      // 2. Se a instância não existir, cria a nova instância via Evolution API v2
      const createUrl = `${this.baseUrl}/instance/create`;
      const payloadCreate = {
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      };

      const resCreate = await this.httpRequest(createUrl, "POST", payloadCreate);
      const newQrCode = resCreate?.qrcode?.base64 || resCreate?.base64 || resCreate?.code;

      return {
        qrcode: newQrCode,
        status: resCreate?.instance?.state || "connecting",
      };
    } catch (error) {
      console.warn(`[EvolutionService] Erro ao obter QR Code da Evolution API em ${this.baseUrl}:`, error);
      return {
        qrcode: undefined,
        status: "disconnected",
      };
    }
  }

  /**
   * Envia uma mensagem de texto pelo WhatsApp via Evolution API
   */
  async sendTextMessage(instanceName: string, number: string, text: string): Promise<boolean> {
    try {
      const cleanNumber = number.replace(/\D/g, "");
      const url = `${this.baseUrl}/message/sendText/${instanceName}`;
      const payload = {
        number: cleanNumber,
        options: { delay: 1200, presence: "composing" },
        textMessage: { text },
      };

      await this.httpRequest(url, "POST", payload);
      return true;
    } catch (error) {
      console.error("[EvolutionService] Erro ao enviar mensagem WhatsApp:", error);
      return false;
    }
  }

  private httpRequest(urlStr: string, method: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const u = new URL(urlStr);
      const isHttps = u.protocol === "https:";
      const client = isHttps ? https : http;

      const data = body ? JSON.stringify(body) : undefined;
      const req = client.request(
        urlStr,
        {
          method,
          agent: isHttps ? AGENT_HTTPS : undefined,
          headers: {
            "Content-Type": "application/json",
            apikey: this.apiKey,
            ...(data && { "Content-Length": Buffer.byteLength(data) }),
          },
        },
        (res) => {
          let chunk = "";
          res.on("data", (d) => (chunk += d));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(chunk || "{}");
              resolve(parsed);
            } catch {
              resolve(chunk);
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      if (data) req.write(data);
      req.end();
    });
  }
}

export const evolutionService = new EvolutionService();
