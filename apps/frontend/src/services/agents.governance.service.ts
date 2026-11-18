import api from "./api";
import type {
  AgentsConnector,
  AgentsSkill,
  AgentsSkillAttachment,
  AgentsSkillVersion,
  CreateConnectorInput,
  CreateSkillInput,
  UpdateConnectorInput,
  UpdateSkillInput,
} from "@/types/agents.types";

/** Skills + connectors clients for /agents (JWT via api.ts). */
export const agentsGovernanceApi = {
  async listSkills(params?: {
    limit?: number;
    offset?: number;
  }): Promise<AgentsSkill[]> {
    const response = await api.get<AgentsSkill[]>("/agents/skills", { params });
    return response.data;
  },

  async getSkill(skillId: string): Promise<AgentsSkill> {
    const response = await api.get<AgentsSkill>(
      `/agents/skills/${encodeURIComponent(skillId)}`,
    );
    return response.data;
  },

  async createSkill(input: CreateSkillInput): Promise<AgentsSkill> {
    const response = await api.post<AgentsSkill>("/agents/skills", input);
    return response.data;
  },

  async updateSkill(
    skillId: string,
    input: UpdateSkillInput,
  ): Promise<AgentsSkill> {
    const response = await api.patch<AgentsSkill>(
      `/agents/skills/${encodeURIComponent(skillId)}`,
      input,
    );
    return response.data;
  },

  async listSkillAttachments(
    skillId: string,
  ): Promise<AgentsSkillAttachment[]> {
    const response = await api.get<AgentsSkillAttachment[]>(
      `/agents/skills/${encodeURIComponent(skillId)}/attachments`,
    );
    return response.data;
  },

  async attachSkill(
    skillId: string,
    agentId: string,
  ): Promise<AgentsSkillAttachment> {
    const response = await api.post<AgentsSkillAttachment>(
      `/agents/skills/${encodeURIComponent(skillId)}/attachments`,
      { agentId },
    );
    return response.data;
  },

  async detachSkill(skillId: string, agentId: string): Promise<void> {
    await api.delete(
      `/agents/skills/${encodeURIComponent(skillId)}/attachments/${encodeURIComponent(agentId)}`,
    );
  },

  async listSkillVersions(skillId: string): Promise<AgentsSkillVersion[]> {
    const response = await api.get<AgentsSkillVersion[]>(
      `/agents/skills/${encodeURIComponent(skillId)}/versions`,
    );
    return response.data;
  },

  async publishSkillVersion(
    skillId: string,
    input: { instructions?: string; changelog?: string | null } = {},
  ): Promise<{ skill: AgentsSkill; version: AgentsSkillVersion }> {
    const response = await api.post<{
      skill: AgentsSkill;
      version: AgentsSkillVersion;
    }>(`/agents/skills/${encodeURIComponent(skillId)}/versions`, input);
    return response.data;
  },

  async restoreSkillVersion(
    skillId: string,
    versionId: string,
  ): Promise<AgentsSkill> {
    const response = await api.post<AgentsSkill>(
      `/agents/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(versionId)}/restore`,
    );
    return response.data;
  },

  async listConnectors(params?: {
    limit?: number;
    offset?: number;
  }): Promise<AgentsConnector[]> {
    const response = await api.get<AgentsConnector[]>("/agents/connectors", {
      params,
    });
    return response.data;
  },

  async listMcpGateways(): Promise<AgentsConnector[]> {
    const response = await api.get<AgentsConnector[]>(
      "/agents/connectors/gateways",
    );
    return response.data;
  },

  async createConnector(
    input: CreateConnectorInput,
  ): Promise<AgentsConnector> {
    const response = await api.post<AgentsConnector>(
      "/agents/connectors",
      input,
    );
    return response.data;
  },

  async updateConnector(
    connectorId: string,
    input: UpdateConnectorInput,
  ): Promise<AgentsConnector> {
    const response = await api.patch<AgentsConnector>(
      `/agents/connectors/${encodeURIComponent(connectorId)}`,
      input,
    );
    return response.data;
  },

  async startConnectorOauth(
    connectorId: string,
  ): Promise<{ connector: AgentsConnector; authorizeUrl: string | null }> {
    const response = await api.post<{
      connector: AgentsConnector;
      authorizeUrl: string | null;
    }>(
      `/agents/connectors/${encodeURIComponent(connectorId)}/oauth/start`,
    );
    return response.data;
  },

  async completeConnectorOauth(
    connectorId: string,
    input: {
      success?: boolean;
      note?: string | null;
      accessToken?: string;
      refreshToken?: string | null;
      tokenType?: string;
      scope?: string | null;
      expiresIn?: number;
    } = {},
  ): Promise<AgentsConnector> {
    const response = await api.post<AgentsConnector>(
      `/agents/connectors/${encodeURIComponent(connectorId)}/oauth/complete`,
      input,
    );
    return response.data;
  },

  async disconnectConnectorOauth(
    connectorId: string,
  ): Promise<AgentsConnector> {
    const response = await api.post<AgentsConnector>(
      `/agents/connectors/${encodeURIComponent(connectorId)}/oauth/disconnect`,
    );
    return response.data;
  },

  async refreshConnectorOauth(
    connectorId: string,
    input: {
      accessToken?: string;
      refreshToken?: string | null;
      expiresIn?: number;
    } = {},
  ): Promise<{ connector: AgentsConnector; token: unknown }> {
    const response = await api.post<{
      connector: AgentsConnector;
      token: unknown;
    }>(
      `/agents/connectors/${encodeURIComponent(connectorId)}/oauth/refresh`,
      input,
    );
    return response.data;
  },
};
