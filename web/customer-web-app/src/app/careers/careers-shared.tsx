import Link from "next/link";

export type CareerJob = {
  id: string; slug: string; title: string; description: string; headerImageUrl?: string | null;
  formUrl?: string | null; department?: string | null; location?: string | null;
  employmentType?: string | null; workplaceType?: string | null; endDate?: string | null;
  publishedAt?: string | null; isOpen?: boolean;
};

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
export const formatCareerDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value)) : "Not specified";

// A deliberately small, text-only Markdown renderer. React escapes every text
// node, so embedded HTML remains visible text and can never become markup.
export function SafeMarkdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const inline = (s: string): React.ReactNode[] => s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-amber-600 underline underline-offset-4 dark:text-amber-400">{link[1]}</a>;
    return <span key={i}>{part}</span>;
  });
  const flush = () => { if (list.length) { blocks.push(<ul key={`list-${blocks.length}`} className="my-5 list-disc space-y-2 pl-6">{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>); list = []; } };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const item = trimmed.match(/^[-*+]\s+(.+)/);
    if (item) { list.push(item[1]); return; }
    flush();
    if (!trimmed) return;
    const heading = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (heading) { const Tag = `h${heading[1].length + 1}` as "h2" | "h3" | "h4"; blocks.push(<Tag key={i} className="mb-3 mt-8 font-bold tracking-tight">{inline(heading[2])}</Tag>); }
    else if (/^>\s/.test(trimmed)) blocks.push(<blockquote key={i} className="my-4 border-l-2 border-amber-500 pl-4 text-zinc-600 dark:text-zinc-300">{inline(trimmed.slice(2))}</blockquote>);
    else blocks.push(<p key={i} className="my-4 leading-7 text-zinc-600 dark:text-zinc-300">{inline(trimmed)}</p>);
  });
  flush();
  return <div>{blocks}</div>;
}

export function RoleFacts({ job }: { job: CareerJob }) {
  return <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
    {[job.department, job.location, job.employmentType, job.workplaceType].filter(Boolean).map((fact) => <span key={fact} className="rounded-full border border-black/10 px-3 py-1.5 dark:border-white/10">{fact}</span>)}
  </div>;
}

export function CareersBackLink() { return <Link href="/careers" className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-400">← Back to Careers</Link>; }
