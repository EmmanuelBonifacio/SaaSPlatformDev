import api from "./api";
import type {
  AgentsConnector,
  AgentsSkill,
  AgentsSkillAttachment,
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

  async listConnectors(params?: {
    limit?: number;
    offset?: number;
  }): Promise<AgentsConnector[]> {
    const response = await api.get<AgentsConnector[]>("/agents/connectors", {
      params,
    });
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
};
