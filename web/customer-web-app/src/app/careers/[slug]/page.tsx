import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { API_URL, CareerJob, CareersBackLink, formatCareerDate, RoleFacts, SafeMarkdown } from "../careers-shared";

type Props = { params: Promise<{ slug: string }> };
async function getJob(slug: string): Promise<{ job: CareerJob | null; failed: boolean }> {
  try {
    const response = await fetch(`${API_URL}/careers/jobs/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
    if (response.status === 404) return { job: null, failed: false };
    if (!response.ok) return { job: null, failed: true };
    const payload = await response.json();
    const job = payload?.data?.job ?? payload?.data;
    return { job: job?.slug ? job : null, failed: false };
  } catch { return { job: null, failed: true }; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const { job } = await getJob(slug);
  if (!job) return { title: "Role unavailable | Asoose Careers", robots: { index: false, follow: true } };
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";
  const title = `${job.title} | Careers at Asoose`;
  const description = job.description?.replace(/[#>*`\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 155) || `Explore the ${job.title} role at Asoose.`;
  return { title, description, alternates: { canonical: `${origin}/careers/${encodeURIComponent(job.slug)}` }, openGraph: { title, description, url: `${origin}/careers/${encodeURIComponent(job.slug)}`, images: job.headerImageUrl ? [{ url: job.headerImageUrl, alt: `${job.title} at Asoose` }] : undefined, type: "article" } };
}

export default async function CareerDetailPage({ params }: Props) {
  const { slug } = await params; const { job, failed } = await getJob(slug);
  if (!job) return <><Navbar/><main className="flex min-h-[70vh] items-center justify-center px-5 pt-20"><div className="max-w-lg text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">↗</div><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-amber-700 dark:text-amber-400">{failed ? "Something went wrong" : "Asoose Careers"}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Role unavailable</h1><p className="mt-3 text-zinc-500 dark:text-zinc-400">{failed ? "We couldn’t load this role right now. Please try again shortly." : "This role may have closed or the link may have changed. Explore our current opportunities."}</p><div className="mt-7"><CareersBackLink/></div></div></main><Footer/></>;
  const available = job.isOpen !== false && (!job.endDate || new Date(job.endDate).getTime() >= Date.now());
  return <><Navbar/><main className="min-h-screen bg-white pt-16 dark:bg-[#0a0a0a]"><article className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12"><CareersBackLink/>
    <div className="mt-7 overflow-hidden rounded-3xl bg-[#f7f4ec] dark:bg-[#171612]">{job.headerImageUrl?.trim() ? <div className="relative h-56 sm:h-80"><img src={job.headerImageUrl.trim()} alt={`${job.title} team and workplace`} className="h-full w-full object-cover"/></div> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-amber-100 via-[#f7f4ec] to-orange-100 dark:from-amber-950/50 dark:via-[#171612] dark:to-orange-950/30"><span className="text-xs font-bold uppercase tracking-[.22em] text-amber-800 dark:text-amber-300">Careers at Asoose</span></div>}
      <div className="p-6 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-700 dark:text-amber-400">{job.department || "Join our team"}</p><h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-5xl">{job.title}</h1><div className="mt-5"><RoleFacts job={job}/></div><div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-500 dark:text-zinc-400"><span>Published {formatCareerDate(job.publishedAt)}</span><span>Deadline {formatCareerDate(job.endDate)}</span></div></div>
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]"><section aria-label="Role description" className="min-w-0 rounded-3xl border border-black/10 p-6 dark:border-white/10 sm:p-9"><SafeMarkdown source={job.description || "More details about this role will be available soon."}/></section><aside className="h-fit rounded-3xl border border-black/10 bg-zinc-50 p-6 dark:border-white/10 dark:bg-white/[.03]"><h2 className="text-lg font-bold">Interested in this role?</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Take the next step and tell us a little about yourself.</p>{available && job.formUrl ? <a href={job.formUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">Apply for this role <span aria-hidden="true">↗</span></a> : <p className="mt-5 rounded-xl bg-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">Applications are closed</p>}<p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Closes {formatCareerDate(job.endDate)}</p></aside></div>
  </article></main><Footer/></>;
}
