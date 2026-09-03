export function normalizeRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const s = rut
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
  if (!s) return null;
  return s;
}
