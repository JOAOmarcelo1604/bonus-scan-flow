import type { EtiquetaLida } from "@/types/api";

/** Chave comparável: minúsculas, sem acento, sem espaço. */
function normKey(k: string) {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s_]+/g, "");
}

function mapaChavesNormalizadas(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [normKey(k), v]),
  );
}

function pickStr(m: Record<string, unknown>, aliases: string[]): string {
  for (const a of aliases) {
    const v = m[normKey(a)];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function pickNum(m: Record<string, unknown>, aliases: string[]): number {
  for (const a of aliases) {
    const v = m[normKey(a)];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/**
 * Objeto literal ou string JSON (muito comum em GET após gravar no banco: `DadosParseados` serializado).
 */
function extrairObjetoRegistro(val: unknown): Record<string, unknown> | null {
  if (val == null) return null;
  if (typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === "string") {
    const t = val.trim();
    if (!t || (t[0] !== "{" && t[0] !== "[")) return null;
    try {
      const p = JSON.parse(t) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/** Chaves que representam peso da etiqueta (não usar `pesototal` do bônus). */
const CHAVES_PESO_FOLHA = new Set(
  [
    "peso",
    "pesobruto",
    "pesoliquido",
    "pesoetiqueta",
    "pesobipado",
    "pesoregistrado",
    "pesolido",
    "pesoinformado",
    "qtpeso",
    "qtdepeso",
    "valorpeso",
    "pesoembalagem",
    "pesounitario",
    "massa",
  ].map(normKey),
);

function buscarPesoProfundo(val: unknown, depth: number): string {
  if (depth > 12 || val == null) return "";
  if (typeof val === "string") {
    const obj = extrairObjetoRegistro(val);
    if (obj) return buscarPesoProfundo(obj, depth + 1);
    return "";
  }
  if (typeof val !== "object") return "";
  if (Array.isArray(val)) {
    for (const item of val) {
      const r = buscarPesoProfundo(item, depth + 1);
      if (r) return r;
    }
    return "";
  }
  const rec = val as Record<string, unknown>;
  for (const [k, v] of Object.entries(rec)) {
    const nk = normKey(k);
    if (!CHAVES_PESO_FOLHA.has(nk)) continue;
    if (v == null) continue;
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
    const s = String(v).trim();
    if (s && typeof v !== "object") return s;
  }
  for (const v of Object.values(rec)) {
    const parsed = extrairObjetoRegistro(v);
    if (parsed) {
      const r = buscarPesoProfundo(parsed, depth + 1);
      if (r) return r;
    }
    if (v && typeof v === "object") {
      const r = buscarPesoProfundo(v, depth + 1);
      if (r) return r;
    }
  }
  return "";
}

/** Alguns GET trazem vários campos como string JSON; mescla no mapa para achar peso. */
function mesclarStringsJsonObjetoRaiz(root: Record<string, unknown>, merged: Record<string, unknown>): void {
  for (const v of Object.values(root)) {
    if (typeof v !== "string") continue;
    const obj = extrairObjetoRegistro(v);
    if (obj) Object.assign(merged, obj);
  }
}

/**
 * Converte qualquer JSON típico de API (.NET PascalCase, camelCase, snake_case)
 * para o formato `EtiquetaLida` usado na UI.
 *
 * API esperada (camelCase): codigoProduto, lote, serie, peso, codigoBarras, fornecedor
 */
export function normalizarEtiquetaLidaApi(raw: unknown): EtiquetaLida {
  if (!raw || typeof raw !== "object") {
    return {
      peso: "",
      codFornec: 0,
      lote: "",
      codigoProduto: "",
      serie: "",
      numBonus: 0,
      fornecedor: "",
      codigoBarras: "",
    };
  }

  const rawTopo = raw;
  let o = raw as Record<string, unknown>;

  const shell = o.data ?? o.Data ?? o.result ?? o.Result ?? o.etiquetaSalva;
  if (shell && typeof shell === "object" && !Array.isArray(shell)) {
    const topNorm = mapaChavesNormalizadas(o);
    const topTemDados =
      pickStr(topNorm, ["codigoproduto", "codigobarras", "lote", "serie", "peso"]) !== "";
    if (!topTemDados) o = shell as Record<string, unknown>;
  }

  /**
   * Backend costuma enviar peso, lote, codigoProduto e serie dentro de `dadosParseados`
   * (objeto ou string JSON). Mesclamos: blob parseado(s), depois a raiz (raiz sobrescreve).
   */
  const merged: Record<string, unknown> = {};
  for (const key of ["dadosOriginais", "DadosOriginais", "dados_originais"] as const) {
    const blob = extrairObjetoRegistro(o[key]);
    if (blob) Object.assign(merged, blob);
  }
  const dpRaw =
    o.dadosParseados ?? o.DadosParseados ?? o.dados_parseados ?? o.Dados_Parseados;
  const dpObj = extrairObjetoRegistro(dpRaw);
  if (dpObj) Object.assign(merged, dpObj);
  mesclarStringsJsonObjetoRaiz(o, merged);

  for (const [k, v] of Object.entries(o)) {
    const nk = normKey(k);
    if (nk === "dadosparsedados" || nk === "parseddata" || nk === "dadosoriginais") continue;
    merged[k] = v;
  }

  const m = mapaChavesNormalizadas(merged);

  let pesoVal = pickStr(m, [
    "peso",
    "pesobruto",
    "peso_liquido",
    "pesoliquido",
    "pesoetiqueta",
    "peso_etiqueta",
    "pesobipado",
    "peso_bipado",
    "pesoregistrado",
    "peso_registrado",
    "pesolido",
    "peso_lido",
    "pesoinformado",
    "peso_informado",
    "qtpeso",
    "qt_peso",
    "qtdepe",
    "qtde_peso",
    "valorpeso",
    "valor_peso",
    "pesoembalagem",
    "peso_embalagem",
    "pesounitario",
    "peso_unitario",
    "massa",
    "pesobrutounit",
    "peso_bruto_unit",
  ]);
  if (!pesoVal) {
    const n = pickNum(m, [
      "peso",
      "pesobruto",
      "peso_liquido",
      "pesoliquido",
      "qtpeso",
      "qt_peso",
      "valorpeso",
      "valor_peso",
    ]);
    if (n !== 0) pesoVal = String(n);
  }
  if (!pesoVal) {
    pesoVal = buscarPesoProfundo(rawTopo, 0);
  }
  const codigoProduto = pickStr(m, [
    "codigoproduto",
    "codigo_produto",
    "codproduto",
    "cod_prod",
    "produto",
    "sku",
    "ean",
  ]);
  const lote = pickStr(m, ["lote", "nrolote", "nr_lote", "lotefabricacao"]);
  const serie = pickStr(m, ["serie", "série", "nserie", "nr_serie", "numeroserie"]);
  const codigoBarras = pickStr(m, ["codigobarras", "codigo_barras", "barras", "gtin"]);
  const fornecedor = pickStr(m, ["fornecedor", "nomefornecedor", "nmfornecedor"]);

  return {
    codigoBarras,
    codigoProduto,
    lote,
    serie,
    peso: pesoVal,
    fornecedor,
    codFornec: pickNum(m, ["codfornec", "cod_fornec", "codfornecedor", "idfornecedor"]),
    numBonus: pickNum(m, ["numbonus", "num_bonus", "numerobonus", "idbonus"]),
  };
}
