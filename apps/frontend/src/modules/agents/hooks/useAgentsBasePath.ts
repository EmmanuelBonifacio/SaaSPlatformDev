"use client";

import { useParams } from "next/navigation";

/** Base path `/[slug]/agents` for nested agents routes. */
export function useAgentsBasePath(): string {
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  return `/${slug ?? ""}/agents`;
}
