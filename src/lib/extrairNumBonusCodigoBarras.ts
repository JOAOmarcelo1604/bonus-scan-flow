/** Mantém só dígitos para comparar / extrair. */
export function somenteDigitos(codigoBarras: string): string {
  return codigoBarras.replace(/\D/g, "");
}

/**
 * Tenta obter o nº do bônus embutido no código de barras da etiqueta.
 * Layout comum: trecho `000010` seguido de 6 dígitos (visto em etiquetas GS1 internas).
 * Usa o último match para evitar falso positivo no prefixo do GTIN.
 */
export function extrairNumBonusCodigoBarras(codigoBarras: string): number | null {
  const d = somenteDigitos(codigoBarras);
  if (d.length < 18) return null;

  const re1 = /000010(\d{6})/g;
  let m: RegExpExecArray | null;
  let ultimo: string | null = null;
  while ((m = re1.exec(d)) !== null) {
    ultimo = m[1];
  }
  if (ultimo) {
    const n = parseInt(ultimo, 10);
    if (n > 0) return n;
  }

  /** Fallback: `010` + 6 dígitos após os primeiros 12 (pula GTIN inicial). */
  const re2 = /010(\d{6})/g;
  ultimo = null;
  while ((m = re2.exec(d)) !== null) {
    if (m.index >= 12) ultimo = m[1];
  }
  if (ultimo) {
    const n = parseInt(ultimo, 10);
    if (n > 0) return n;
  }

  return null;
}
