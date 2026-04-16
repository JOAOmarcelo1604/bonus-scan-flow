/** GET /api/bonus/disponiveis/:codFilial — bônus ainda abertos (ex.: DTFECHAMENTO nulo), fluxo recebimento. */
export interface BonusDisponivel {
  FORNECEDOR: string;
  NUMBONUS: number;
  DATABONUS: string;
  PESOTOTAL: string;
  /** GET /api/bonus/disponiveis-apos-auditoria/:codFilial — id da auditoria associada. */
  ID_AUDITORIA?: number;
}

export interface BiparRequest {
  codigoBarras: string;
  numBonus: number;
}

export interface EtiquetaLida {
  peso: string;
  codFornec: number;
  lote: string;
  codigoProduto: string;
  serie: string;
  numBonus: number;
  fornecedor: string;
  codigoBarras: string;
}

/** Linha na tabela de bipagem (id estável para destaque visual). */
export type EtiquetaLidaComLinha = EtiquetaLida & {
  _rowId: string;
  /** true quando a etiqueta já havia sido bipada em sessão anterior (bônus reprovado/reaberto). */
  _anterior?: boolean;
};

export interface AuditoriaRequest {
  numBonus: number;
  nf: string;
  observacao: string;
}

export interface AuditoriaModel {
  id: number;
  numBonus: number;
  nf: string;
  status: string;
  observacao: string;
}

/* ── Dobra de Materiais ── */

export interface DobraBiparRequest {
  codigoBarras: string;
  numBonus: number;
  qtBarras: number;
}

export interface DobraRegistrada {
  id: number;
  codigoBarras: string;
  codProd: string;
  numLote: string;
  serie: string;
  qtBarras: number;
  pesoTotal: number;
  status: string;
  dtDobra: string;
  pcBonusc: { numBonus: number };
}

export interface DobraBiparResponse {
  dobraRegistrada: DobraRegistrada;
  dadosParseados: {
    codigoProduto: string;
    lote: string;
    peso: string;
    serie: string;
  };
}

/** Linha na tabela de dobras (id estável para destaque visual). */
export type DobraRegistradaComLinha = DobraRegistrada & { _rowId: string };

/* ── Inventário ── */

export interface InventarioResumo {
  reto: number;
  dobrado: number;
  solto: number;
  separado: number;
}

/** Linha retornada por GET /api/inventario, /hoje, /pendentes (campos opcionais por endpoint). */
export interface InventarioItem {
  id: number;
  codigoBarras?: string;
  codProd?: string;
  numLote?: string;
  serie?: string;
  qtBarras?: number;
  pesoTotal?: number;
  /** Ex.: RETO, DOBRADO ou código R, D (backend). */
  status?: string;
  dtDobra?: string;
  numBonus?: number;
  pcBonusc?: { numBonus: number };
  observacao?: string;
}

/** POST /api/inventario/bipar */
export interface InventarioBiparRequest {
  codigoBarras: string;
  status: string;
  /** Opcional: o backend pode inferir o bônus pela etiqueta. */
  numBonus?: number;
}

/** PUT /api/inventario/reprovar/{id} */
export interface InventarioReprovarRequest {
  observacao: string;
}
