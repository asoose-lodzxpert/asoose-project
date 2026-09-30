import { Suspense } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import CareersListing from "./CareersListing";

export const metadata = { title: "Careers at Asoose | Join our team", description: "Explore open roles at Asoose and help us make everyday services work better for our communities.", alternates: { canonical: "/careers" } };

export default function CareersPage() {
  return <><Navbar/><Suspense fallback={<main className="min-h-screen pt-28 text-center">Loading careers…</main>}><CareersListing/></Suspense><Footer/></>;
}
