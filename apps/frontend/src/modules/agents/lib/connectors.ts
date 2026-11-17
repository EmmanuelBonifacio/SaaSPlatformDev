import type { ConnectorKind } from "@/types/agents.types";

/** Suggested non-secret hosts for fleet-style connectors (no credentials). */
export const CONNECTOR_KIND_HINTS: Record<
  ConnectorKind,
  { label: string; hostHint?: string }
> = {
  webhook: { label: "Webhook" },
  mcp: { label: "MCP gateway" },
  fleet_traccar: {
    label: "Fleet · Traccar",
    hostHint: "http://traccar:8082",
  },
  fleet_fleetbase: {
    label: "Fleet · Fleetbase",
    hostHint: "http://fleetbase:4200",
  },
  fleet_fleetms: {
    label: "Fleet · Fleetms",
    hostHint: "http://fleetms:4000",
  },
  custom: { label: "Custom" },
};

export const CONNECTOR_KINDS = Object.keys(
  CONNECTOR_KIND_HINTS,
) as ConnectorKind[];
