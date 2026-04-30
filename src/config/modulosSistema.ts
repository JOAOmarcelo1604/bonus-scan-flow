/**
 * Lista canônica (deve coincidir com os `title` dos cards na home que entram na matriz de permissão).
 */
export const MODULOS_SISTEMA: readonly string[] = [
  "Recebimento Bônus",
  "Auditorias",
  "Aprovação Bônus",
  "Dobra de Materiais",
  "Abertura de Materiais",
  "Separação de Volumes",
  "Inventário — consulta",
  "Registro de inventário",
  "Aprovação de inventário",
  "Solicitações de Etiquetas",
  "Rel. Inventário por Bitola",
  "Rel. Auditoria de Estoque",
  "Rel. Estoque Físico por Data",
  "BI Expedição (inventário)",
  "Reimpressão de Etiquetas",
];

/** Gravações antigas / erro de digitação → título atual do sistema */
const ALIASES_TITULO_MODULO: ReadonlyMap<string, string> = new Map([
  ["Recebimento BôEnus", "Recebimento Bônus"],
]);

/** Normaliza hífen, traços e espaços para comparar nomes vindos da API/arquivo JSON. */
function chaveTituloRelaxada(s: string): string {
  return s
    .trim()
    .normalize("NFC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\u002D\u2010\u2011\u2012\u2013\u2014\u2212\uFE58\uFE63]/g, "-");
}

/**
 * Obtém um título canônico de {@link MODULOS_SISTEMA} a partir da string gravada no backend,
 * ou null se não houver equivalência reconhecível.
 */
function resolverTituloModuloPersistido(raw: string): string | null {
  const trimmed = raw.trim().normalize("NFC");
  if (!trimmed) {
    return null;
  }

  const porAliasExato = ALIASES_TITULO_MODULO.get(trimmed);
  if (porAliasExato && MODULOS_SISTEMA.includes(porAliasExato)) {
    return porAliasExato;
  }

  const chaveRelax = chaveTituloRelaxada(trimmed);
  const porAliasRelax = [...ALIASES_TITULO_MODULO.entries()].find(([k]) => chaveTituloRelaxada(k) === chaveRelax);
  if (porAliasRelax?.[1] && MODULOS_SISTEMA.includes(porAliasRelax[1])) {
    return porAliasRelax[1];
  }

  if (MODULOS_SISTEMA.includes(trimmed)) {
    return trimmed;
  }

  for (const m of MODULOS_SISTEMA) {
    if (chaveTituloRelaxada(m) === chaveRelax) {
      return m;
    }
  }

  return null;
}

/** Converte lista vinda da API/arquivo para títulos atuais, sem duplicar. */
export function normalizarListaModulosPermissao(bruto: string[] | null | undefined): string[] {
  if (!bruto?.length) {
    return [];
  }
  const out = new Set<string>();
  for (const nome of bruto) {
    const canon = resolverTituloModuloPersistido(nome);
    if (canon) {
      out.add(canon);
    }
  }
  return Array.from(out);
}
