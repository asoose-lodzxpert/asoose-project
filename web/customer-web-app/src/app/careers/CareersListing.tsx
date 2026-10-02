"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, MapPin, Search } from "lucide-react";
import { CareerJob, formatCareerDate, RoleFacts } from "./careers-shared";

type PageData = { jobs: CareerJob[]; pagination?: { page: number; limit: number; total: number; totalPages: number } };
const paramsFor = (params: URLSearchParams) => {
  const result = new URLSearchParams();
  ["page", "limit", "search", "department", "location", "employmentType", "workplaceType"].forEach((key) => { const value = params.get(key); if (value) result.set(key, value); });
  return result;
};

export default function CareersListing() {
  const router = useRouter(); const searchParams = useSearchParams();
  const query = useMemo(() => paramsFor(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [data, setData] = useState<PageData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const current = Object.fromEntries(query.entries());
  const update = (key: string, value: string) => { const next = new URLSearchParams(query); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.set("page", "1"); router.push(`/careers${next.size ? `?${next}` : ""}`, { scroll: false }); };

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      // Use Next's same-origin backend rewrite in the browser. The public API
      // does not permit requests from asoose.com, so calling it directly here
      // is blocked by CORS before a response can be read.
      const response = await fetch(`/api/backend/careers/jobs?${query.toString()}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to retrieve roles");
      const payload = await response.json();
      setData(payload?.data ?? { jobs: [] });
    } catch { setError(true); setData(null); } finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  const roles = (data?.jobs ?? []).filter((job) => job.isOpen !== false);
  const facets = (key: "department" | "location" | "employmentType" | "workplaceType") => [...new Set((data?.jobs ?? []).map((job) => job[key]).filter((v): v is string => Boolean(v)))].sort();
  const page = Number(data?.pagination?.page ?? current.page ?? 1); const pages = Number(data?.pagination?.totalPages ?? 1);

  return <main className="min-h-screen bg-white pt-16 text-zinc-950 dark:bg-[#0a0a0a] dark:text-white">
    <section className="relative overflow-hidden border-b border-black/5 bg-[#faf8f2] dark:border-white/10 dark:bg-[#11110e]">
      <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-5 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-amber-700 dark:text-amber-400">Build what matters</p><h1 className="max-w-3xl text-4xl font-black tracking-[-.05em] sm:text-5xl">Join Asoose<span className="text-amber-500">.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">We’re making everyday services work better for the communities we call home. Bring your ideas, your craft, and your curiosity—and help us move forward together.</p></div>
        <a href="#open-roles" className="inline-flex w-fit items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400">Explore open roles <ArrowRight size={16}/></a>
      </div>
    </section>

    <section id="open-roles" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-amber-700 dark:text-amber-400">Opportunities</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Open roles</h2></div><p className="text-xs text-zinc-500 dark:text-zinc-400">Find the role that fits your next move.</p></div>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-zinc-50 p-2 dark:border-white/10 dark:bg-white/[.03] sm:grid-cols-3 lg:grid-cols-5">
        <label className="relative col-span-2 sm:col-span-1"><span className="sr-only">Search roles</span><Search size={15} className="absolute left-3 top-3 text-zinc-400"/><input value={current.search ?? ""} onChange={(e) => update("search", e.target.value)} placeholder="Search roles" className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-[#111]"/></label>
        {([["department", "Department"], ["location", "Location"], ["employmentType", "Employment type"], ["workplaceType", "Workplace"]] as const).map(([key, label]) => <label key={key}><span className="sr-only">{label}</span><select value={current[key] ?? ""} onChange={(e) => update(key, e.target.value)} className="w-full min-w-0 rounded-lg border border-black/10 bg-white px-2 py-2 text-xs outline-none focus:border-amber-500 dark:border-white/10 dark:bg-[#111]"><option value="">{label}</option>{facets(key).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
      </div>
      <div className="mt-8" aria-live="polite" aria-busy={loading}>
        {loading && <div className="grid gap-4 md:grid-cols-2"><div className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/5"/><div className="h-56 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/5"/></div>}
        {!loading && error && <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30"><h3 className="font-bold">We couldn’t load open roles</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Please check your connection and try again.</p><button onClick={() => void load()} className="mt-5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-white dark:text-black">Try again</button></div>}
        {!loading && !error && !roles.length && <div className="rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center dark:border-white/15"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"><BriefcaseBusiness size={21}/></div><h3 className="mt-4 text-lg font-bold">No open roles right now</h3><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Try changing your filters, or check back soon for new opportunities.</p></div>}
        {!loading && !error && roles.length > 0 && <><div className="grid gap-3 sm:grid-cols-2">{roles.map((job) => <Link href={`/careers/${encodeURIComponent(job.slug)}`} key={job.id} className="group flex min-w-0 overflow-hidden rounded-xl border border-black/10 bg-white transition hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-white/[.03] dark:hover:border-amber-400">{job.headerImageUrl?.trim() && <div className="h-28 w-28 shrink-0 self-stretch overflow-hidden bg-zinc-100 sm:h-32 sm:w-36 dark:bg-white/5"><img src={job.headerImageUrl.trim()} alt={`${job.title} role`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105"/></div>}<div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-base font-bold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-400">{job.title}</h3><ArrowRight size={17} className="mt-0.5 shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-amber-600"/></div><div className="mt-2"><RoleFacts job={job}/></div><div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs"><span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400"><MapPin size={13}/> Closes {formatCareerDate(job.endDate)}</span><span className="font-bold text-amber-700 dark:text-amber-400">View role</span></div></div></Link>)}</div>
          {pages > 1 && <nav aria-label="Careers pagination" className="mt-9 flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => update("page", String(page - 1))} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10">Previous</button><span className="text-sm text-zinc-500">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => update("page", String(page + 1))} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10">Next</button></nav>}</>}
      </div>
    </section>
  </main>;
}
