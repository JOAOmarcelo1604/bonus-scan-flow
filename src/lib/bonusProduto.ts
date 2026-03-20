/** Normaliza chave de produto para cruzar com `EtiquetaLida.codigoProduto`. */
export function chaveCodigoProduto(codigo: string) {
  return codigo.trim();
}

export interface BonusProdutoLinha {
  /** Índice estável na lista (para React key). */
  rowKey: string;
  /** CODPROD (código interno), exibido na coluna Código. */
  codigo: string;
  /** EAN/GTIN quando a API enviar — útil para cruzar com `codigoProduto` do bip. */
  ean: string;
  descricao: string;
  qtdNf: number;
  /** Qtd Entrada vinda do GET /api/bonus/{num}/produtos (atualizada no servidor após bip). */
  qtdEntradaInicial: number;
  lote: string;
  fornecedor: string;
}

/** Chaves em minúsculo → valor (JSON costuma preservar casing; unificamos). */
function recordKeysLower(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k.toLowerCase(), v]),
  );
}

/** Busca em profundidade o primeiro array cujos itens são objetos (linhas de produto). */
function acharArrayProdutosAninhado(obj: unknown, maxDepth: number): unknown[] {
  if (maxDepth < 0 || obj == null || typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [];
    const todosObjetos = obj.every(
      (item) => item != null && typeof item === "object" && !Array.isArray(item),
    );
    return todosObjetos ? obj : [];
  }
  const o = obj as Record<string, unknown>;
  for (const v of Object.values(o)) {
    const found = acharArrayProdutosAninhado(v, maxDepth - 1);
    if (found.length > 0) return found;
  }
  return [];
}

/**
 * Muitas APIs não devolvem o array na raiz. Ex.: { data: [] }, { produtos: [] }, Page { content }.
 */
export function extrairArrayProdutosResposta(payload: unknown): unknown[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const o = payload as Record<string, unknown>;

  const nestedKeys = [
    "data",
    "produtos",
    "items",
    "result",
    "content",
    "rows",
    "lista",
    "list",
    "records",
    "values",
    "value",
    "results",
  ];

  for (const key of nestedKeys) {
    // tenta exato e minúsculo
    const v = o[key] ?? o[key.charAt(0).toUpperCase() + key.slice(1)];
    if (Array.isArray(v)) return v;
  }

  // PascalCase comuns em .NET
  for (const key of ["Data", "Produtos", "Items", "Result", "Content", "Rows"]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
  }

  // Objetos aninhados: { data: { lista: [ ... ] } }
  const emProfundidade = acharArrayProdutosAninhado(payload, 4);
  if (emProfundidade.length > 0) return emProfundidade;

  // Primeiro array de objetos em qualquer propriedade do primeiro nível
  for (const v of Object.values(o)) {
    if (!Array.isArray(v) || v.length === 0) continue;
    if (v.every((item) => item != null && typeof item === "object" && !Array.isArray(item))) {
      return v;
    }
  }

  // Um único objeto que parece linha de produto → uma linha
  const lower = recordKeysLower(o);
  if (
    lower.codigo ||
    lower.codigoproduto ||
    lower.codprod ||
    lower.sku ||
    lower.ean ||
    lower.descricao ||
    lower.descproduto
  ) {
    return [payload];
  }

  return [];
}

function pickStr(lower: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function pickNum(lower: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/** Achata um nível: alguns backends mandam { produto: { ... } }. */
function achatarObjetoProduto(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const top = recordKeysLower(raw as object);
  const nestedKeys = ["produto", "product", "item", "dados", "data"];
  for (const nk of nestedKeys) {
    const inner = top[nk];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return { ...recordKeysLower(inner as object), ...top };
    }
  }
  return top;
}

/** Aceita vários formatos comuns de JSON do backend. */
export function normalizarProdutoBonus(raw: unknown, index: number): BonusProdutoLinha | null {
  if (!raw || typeof raw !== "object") return null;
  const lower = achatarObjetoProduto(raw);

  const codigo = pickStr(lower, [
    "codprod",
    "cod_prod",
    "codproduc",
    "codpro",
    "cdprod",
    "cd_prod",
    "codigo",
    "codigoproduto",
    "cod_produto",
    "codproduto",
    "sku",
    "referencia",
    "ref",
    "idproduto",
    "produtoid",
    "cod_item",
    "coditem",
    "cdproduto",
    "cd_produto",
  ]);

  const ean = pickStr(lower, [
    "ean",
    "codigoean",
    "codigo_ean",
    "codigoeans",
    "gtin",
    "codbarras",
    "codigo_barras",
    "codigobarras",
    "barcode",
    "cd_ean",
  ]);

  const descricao = pickStr(lower, [
    "descricao",
    "descproduto",
    "desc_produto",
    "nome",
    "descrição",
    "dsproduto",
    "nmproduto",
  ]);

  // Sem código nem descrição: provavelmente não é linha de produto
  if (!codigo && !descricao) return null;

  const codigoFinal = codigo || `—${index}`;

  return {
    rowKey: `${codigoFinal}-${index}`,
    codigo: codigo || "—",
    ean,
    descricao,
    qtdNf: pickNum(lower, [
      "qtd_nf",
      "qtdnf",
      "quantidadenf",
      "qtd_nf_doc",
      "qt_nf",
      "qtdpedido",
      "quantidade",
    ]),
    qtdEntradaInicial: pickNum(lower, [
      "qtd_entrada",
      "qtdentrada",
      "qtentrada",
      "quantidadeentrada",
      "qtd_recebida",
      "qtdrecebida",
      "entrada",
    ]),
    lote: pickStr(lower, ["lote", "nrolote", "nr_lote", "lotefabricacao"]),
    fornecedor: pickStr(lower, ["fornecedor", "nomefornecedor", "nmfornecedor", "fornec"]),
  };
}

export function normalizarListaProdutosBonus(payload: unknown): BonusProdutoLinha[] {
  const arr = extrairArrayProdutosResposta(payload);
  return arr
    .map((item, i) => normalizarProdutoBonus(item, i))
    .filter((row): row is BonusProdutoLinha => row != null);
}
