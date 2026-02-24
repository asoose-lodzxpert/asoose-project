/** Safely extract a displayable string from an address that may be a raw Prisma object */
export const resolveAddress = (addr: unknown): string => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  const a = addr as Record<string, unknown>;
  const raw = String(a.address ?? a.street ?? a.label ?? a.name ?? "");
  // Guard against legacy 'Unknown' values persisted in old records
  return raw.toLowerCase() === "unknown" ? "" : raw;
};
