/** Normalización de texto de la app: MAYÚSCULAS + sin acentos + espacios simples.
 *  Se aplica a nombres, emails, cargos, departamentos, sucursales, empresas, etc.
 *  para que el dato guardado sea uniforme y las comparaciones no fallen por
 *  mayúsculas ni tildes. */
export function nom(s?: string | null): string {
  return (s ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Igual que nom() pero conserva los saltos de línea (notas, textos largos). */
export function txt(s?: string | null): string {
  return (s ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Comparación ignorando mayúsculas y acentos. */
export function nomEq(a?: string | null, b?: string | null): boolean {
  return (
    (a ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
    (b ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );
}