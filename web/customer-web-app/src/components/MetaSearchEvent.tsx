"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel";

export function MetaSearchEvent({ category }: { category: string }) {
  useEffect(() => {
    trackMetaEvent("Search", { content_category: category });
  }, [category]);

  return null;
}
