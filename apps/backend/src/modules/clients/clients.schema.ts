import { z } from "zod";
import {
  CLIENT_ORIGENS,
  CLIENT_PLANOS,
  CLIENT_STATUSES,
} from "./clients.types";

const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .default([]);

const modulesSchema = z
  .object({
    financeiro: z.boolean().optional(),
    agentes: z.boolean().optional(),
    comercial: z.boolean().optional(),
  })
  .default({});

export const authenticatedUserIdSchema = z.string().uuid();

export const clientIdParamsSchema = z.object({
  clientId: z.string().uuid(),
});

export const listClientsSchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(5_000).default(0),
});

export const upsertClientSchema = z.object({
  nomeFantasia: z.string().trim().min(2).max(160),
  cnpjCpf: z.string().trim().min(11).max(32).optional().nullable(),
  status: z.enum(CLIENT_STATUSES).default("lead"),
  tags: tagsSchema,
  origem: z.enum(CLIENT_ORIGENS).optional().nullable(),
  plano: z.enum(CLIENT_PLANOS).optional().nullable(),
  mrr: z.coerce.number().min(0).max(1_000_000_000).default(0),
  responsavel: z.string().trim().max(120).optional().nullable(),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  email: z
    .union([z.string().trim().email().max(180), z.literal("")])
    .optional()
    .nullable(),
  produtoContratado: z.string().trim().max(240).optional().nullable(),
  dorPrincipal: z.string().trim().max(4_000).optional().nullable(),
  objetivoSaas: z.string().trim().max(4_000).optional().nullable(),
  modulos: modulesSchema,
  dashboardLink: z
    .union([z.string().trim().url().max(500), z.literal("")])
    .optional()
    .nullable(),
  externalId: z.string().trim().max(120).optional().nullable(),
  /** Texto do relatório do dia — anexado ao histórico sem duplicar bloco idêntico. */
  relatorioNota: z.string().trim().max(8_000).optional().nullable(),
});

export type ListClientsDto = z.infer<typeof listClientsSchema>;
export type UpsertClientDto = z.infer<typeof upsertClientSchema>;
