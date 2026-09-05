export const RUT_PATTERN = /^[0-9]{7,8}-[0-9k]$/;

export const RUT_FORMAT_ERROR =
  "Usa formato 17969468-9 (sin puntos, con guion)";

export function getRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "k";
  return String(remainder);
}

export function isValidRut(rut: string | null | undefined): boolean {
  if (!rut) return false;
  const value = rut.trim().toLowerCase();
  if (!RUT_PATTERN.test(value)) return false;
  const [body, dv] = value.split("-");
  return getRutDv(body) === dv;
}

export function normalizeRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const value = rut.trim().toLowerCase();
  if (!isValidRut(value)) return null;
  return value;
}

export function formatRut(rut: string | null | undefined): string {
  return normalizeRut(rut) || "";
}
