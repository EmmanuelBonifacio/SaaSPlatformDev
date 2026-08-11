// =============================================================================
// src/config/jwt.ts
// =============================================================================
// Configuração centralizada de JWT.
// Um único lugar para controlar secrets, expiração e payload mínimo.
//
// Regra de segurança:
//   O payload do JWT é assinado mas NÃO criptografado — qualquer um com
//   acesso ao token pode ler o payload com base64 decode.
//   NUNCA incluir dados sensíveis no payload: email, CPF, senha, endereço.
// =============================================================================

import { env } from "./env";

export const jwtConfig = {
  access: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN, // padrão: 15m
  },
  refresh: {
    secret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN, // padrão: 30d
  },
} as const;

// Payload mínimo — o menor conjunto de dados necessário para autenticar
// NÃO incluir: email, cpf, telefone, endereço, dados financeiros
export interface JwtPayload {
  sub: string;        // userId (UUID)
  role: string;       // 'driver' | 'admin' | 'manager'
  tenantId: string;   // UUID do tenant
  name?: string;      // nome de exibição (não sensível)
}
