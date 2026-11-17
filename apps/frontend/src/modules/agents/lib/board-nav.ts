import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CircleDot,
  DollarSign,
  FolderOpen,
  History,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  Network,
  Package,
  Repeat,
  Search,
  Settings,
  Target,
  Unplug,
  Bot,
  ShieldCheck,
  Activity,
} from "lucide-react";

export type BoardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
  badgeKey?: "inbox" | "approvals" | "live";
};

export const BOARD_TOP_NAV: BoardNavItem[] = [
  { href: "/search", label: "Search", icon: Search, match: "prefix" },
  { href: "", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/inbox", label: "Inbox", icon: Inbox, match: "prefix", badgeKey: "inbox" },
  { href: "/chats", label: "Chat", icon: MessagesSquare, match: "prefix" },
];

export const BOARD_WORK_NAV: BoardNavItem[] = [
  { href: "/tasks", label: "Tasks", icon: CircleDot, match: "prefix" },
  { href: "/routines", label: "Routines", icon: Repeat, match: "prefix" },
  { href: "/goals", label: "Goals", icon: Target, match: "prefix" },
  { href: "/artifacts", label: "Artifacts", icon: Package, match: "prefix" },
  { href: "/skills", label: "Skills", icon: Boxes, match: "prefix" },
  { href: "/projects", label: "Projects", icon: FolderOpen, match: "prefix" },
];

export const BOARD_AGENTS_NAV: BoardNavItem[] = [
  { href: "/list", label: "All agents", icon: Bot, match: "prefix" },
];

export const BOARD_COMPANY_NAV: BoardNavItem[] = [
  { href: "/org", label: "Org", icon: Network, match: "prefix" },
  { href: "/connectors", label: "Connectors", icon: Unplug, match: "prefix" },
  {
    href: "/approvals",
    label: "Approvals",
    icon: ShieldCheck,
    match: "prefix",
    badgeKey: "approvals",
  },
  {
    href: "/runs",
    label: "Runs",
    icon: Activity,
    match: "prefix",
    badgeKey: "live",
  },
  { href: "/costs", label: "Costs", icon: DollarSign, match: "prefix" },
  { href: "/activity", label: "Activity", icon: History, match: "prefix" },
  { href: "/settings", label: "Settings", icon: Settings, match: "prefix" },
];

const RESERVED_AGENT_SEGMENTS = new Set([
  "list",
  "new",
  "tasks",
  "approvals",
  "runs",
  "activity",
  "settings",
  "skills",
  "connectors",
  "org",
  "costs",
  "inbox",
  "chats",
  "search",
  "projects",
  "routines",
  "goals",
  "artifacts",
]);

export function isAgentDetailPath(pathname: string, base: string): boolean {
  if (!pathname.startsWith(`${base}/`)) return false;
  const rest = pathname.slice(base.length + 1).split("/")[0] ?? "";
  return Boolean(rest) && !RESERVED_AGENT_SEGMENTS.has(rest);
}

export function isBoardNavActive(
  pathname: string,
  base: string,
  href: string,
  match: "exact" | "prefix" = "prefix",
): boolean {
  const target = `${base}${href}`;
  if (match === "exact") {
    return pathname === target || pathname === `${target}/`;
  }
  if (href === "/list") {
    return (
      pathname === target ||
      pathname.startsWith(`${target}/`) ||
      pathname === `${base}/new` ||
      isAgentDetailPath(pathname, base)
    );
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}
