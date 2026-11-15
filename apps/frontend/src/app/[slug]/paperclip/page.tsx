import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Redirect legado: /:slug/paperclip → /:slug/agents */
export default async function PaperclipRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/${slug}/agents`);
}
