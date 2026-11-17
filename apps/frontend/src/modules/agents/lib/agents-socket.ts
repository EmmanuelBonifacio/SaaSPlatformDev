import { io, type Socket } from "socket.io-client";
import { TOKEN_KEY } from "@/services/api";

export function resolveAgentsSocketTarget(): { url: string; path: string } {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "/backend").replace(
    /\/$/,
    "",
  );
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return { url: raw, path: "/socket.io" };
  }
  if (typeof window !== "undefined") {
    return { url: window.location.origin, path: `${raw}/socket.io` };
  }
  return { url: "http://localhost:3000", path: "/socket.io" };
}

let shared: Socket | null = null;
let refCount = 0;

export function acquireAgentsSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (!shared) {
    const { url, path } = resolveAgentsSocketTarget();
    shared = io(`${url}/agents`, {
      path,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
      autoConnect: true,
    });
  }
  refCount += 1;
  return shared;
}

export function releaseAgentsSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && shared) {
    shared.removeAllListeners();
    shared.disconnect();
    shared = null;
  }
}
