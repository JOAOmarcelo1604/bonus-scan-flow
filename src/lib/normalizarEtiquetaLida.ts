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

  let o = raw as Record<string, unknown>;

  const shell = o.data ?? o.Data ?? o.result ?? o.Result;
  if (shell && typeof shell === "object" && !Array.isArray(shell)) {
    const topNorm = mapaChavesNormalizadas(o);
    const topTemDados =
      pickStr(topNorm, ["codigoproduto", "codigobarras", "lote", "serie", "peso"]) !== "";
    if (!topTemDados) o = shell as Record<string, unknown>;
  }

  /**
   * Backend costuma enviar peso, lote, codigoProduto e serie dentro de `dadosParseados`.
   * Mesclamos: primeiro o objeto interno, depois a raiz (raiz sobrescreve — ex.: codFornec, fornecedor).
   */
  const dp =
    o.dadosParseados ?? o.DadosParseados ?? o.dados_parseados ?? o.Dados_Parseados;
  const merged: Record<string, unknown> = {};
  if (dp && typeof dp === "object" && !Array.isArray(dp)) {
    Object.assign(merged, dp as Record<string, unknown>);
  }
  for (const [k, v] of Object.entries(o)) {
    if (normKey(k) === "dadosparsedados" || normKey(k) === "parseddata") continue;
    merged[k] = v;
  }

  const m = mapaChavesNormalizadas(merged);

  const pesoVal = pickStr(m, ["peso", "pesobruto", "peso_liquido", "pesoliquido"]);
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
