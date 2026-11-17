"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentsLiveDashboard, AgentsRun } from "@/types/agents.types";
import {
  acquireAgentsSocket,
  releaseAgentsSocket,
} from "../lib/agents-socket";

type Options = {
  onLive?: (live: AgentsLiveDashboard) => void;
  onRunEvent?: () => void;
  enabled?: boolean;
};

/**
 * Live dashboard via Socket.IO `/agents` (JWT). Falls back to HTTP poll if socket fails.
 */
export function useAgentsLiveSocket(options: Options = {}): {
  live: AgentsLiveDashboard | null;
  connected: boolean;
  socketMode: "socket" | "poll" | "idle";
} {
  const { onLive, onRunEvent, enabled = true } = options;
  const [live, setLive] = useState<AgentsLiveDashboard | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketMode, setSocketMode] = useState<"socket" | "poll" | "idle">(
    "idle",
  );
  const onLiveRef = useRef(onLive);
  const onRunEventRef = useRef(onRunEvent);
  onLiveRef.current = onLive;
  onRunEventRef.current = onRunEvent;

  useEffect(() => {
    if (!enabled) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let usingSocket = false;
    const socket = acquireAgentsSocket();

    const applyLive = (next: AgentsLiveDashboard) => {
      if (cancelled) return;
      setLive(next);
      onLiveRef.current?.(next);
    };

    const startPollFallback = async () => {
      if (usingSocket || cancelled || pollTimer) return;
      setSocketMode("poll");
      const { agentsApiService } = await import("@/services/agents.service");
      const tick = async () => {
        try {
          const next = await agentsApiService.getLiveDashboard();
          applyLive(next);
        } catch {
          // best-effort
        }
      };
      void tick();
      pollTimer = setInterval(() => void tick(), 5000);
    };

    if (!socket) {
      void startPollFallback();
      return () => {
        cancelled = true;
        if (pollTimer) clearInterval(pollTimer);
        releaseAgentsSocket();
      };
    }

    const failTimer = setTimeout(() => {
      if (!usingSocket) void startPollFallback();
    }, 4000);

    const onConnect = () => {
      if (cancelled) return;
      usingSocket = true;
      setConnected(true);
      setSocketMode("socket");
      clearTimeout(failTimer);
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      socket.emit("live:subscribe");
    };

    const onDisconnect = () => setConnected(false);

    const onConnectError = () => {
      setConnected(false);
      if (!usingSocket) void startPollFallback();
    };

    const onLiveUpdate = (next: AgentsLiveDashboard) => {
      usingSocket = true;
      setSocketMode("socket");
      applyLive(next);
    };

    const bumpRuns = (_run: Partial<AgentsRun> & { id: string }) => {
      onRunEventRef.current?.();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("live:update", onLiveUpdate);
    socket.on("run:started", bumpRuns);
    socket.on("run:heartbeat", bumpRuns);
    socket.on("run:finished", bumpRuns);

    if (socket.connected) onConnect();

    return () => {
      cancelled = true;
      clearTimeout(failTimer);
      if (pollTimer) clearInterval(pollTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("live:update", onLiveUpdate);
      socket.off("run:started", bumpRuns);
      socket.off("run:heartbeat", bumpRuns);
      socket.off("run:finished", bumpRuns);
      releaseAgentsSocket();
    };
  }, [enabled]);

  return { live, connected, socketMode };
}
