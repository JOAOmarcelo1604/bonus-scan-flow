const PREFIX = "bsf-etiqueta-peso";

function key(numBonus: number): string {
  return `${PREFIX}:${numBonus}`;
}

/** Grava o peso exibido no bip (mesmo navegador), para reaproveitar na listagem quando o GET não traz peso. */
export function rememberEtiquetaPeso(numBonus: number, codigoBarras: string, peso: string): void {
  const b = codigoBarras.trim();
  const p = (peso ?? "").trim();
  if (!b || !p) return;
  try {
    const raw = localStorage.getItem(key(numBonus));
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[b] = p;
    localStorage.setItem(key(numBonus), JSON.stringify(map));
  } catch {
    /* quota ou JSON inválido */
  }
}

export function etiquetaPesoFromCache(numBonus: number, codigoBarras: string): string {
  const b = codigoBarras.trim();
  if (!b) return "";
  try {
    const raw = localStorage.getItem(key(numBonus));
    if (!raw) return "";
    const map = JSON.parse(raw) as Record<string, string>;
    return (map[b] ?? "").trim();
  } catch {
    return "";
  }
}
