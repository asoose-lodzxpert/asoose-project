import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Custom404() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white px-6">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">
        Oops! The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-600 text-white rounded-md flex items-center gap-2 hover:bg-orange-700 transition-colors"
      >
        Go Home <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Structured Data for 404 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "404 Not Found",
            description:
              "The requested page could not be found on this server.",
            url: "https://www.asoose.com/404",
          }),
        }}
      />
    </div>
  );
}
