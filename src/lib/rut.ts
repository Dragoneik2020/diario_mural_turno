export function normalizeRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const compact = rut
    .trim()
    .toLowerCase()
    .replace(/[^0-9k]/g, "");
  if (compact.length < 2) return null;
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}

export function formatRut(rut: string | null | undefined): string {
  return normalizeRut(rut) || "";
}
