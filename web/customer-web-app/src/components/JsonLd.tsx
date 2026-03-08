/**
 * JsonLd — injects a JSON-LD structured-data <script> block.
 *
 * Usage (server component):
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", ... }} />
 *
 * Never renders user-controlled content directly into dangerouslySetInnerHTML.
 * All data is JSON-serialised through JSON.stringify which escapes all HTML
 * special characters.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
