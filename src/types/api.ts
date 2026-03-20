/** Resposta de GET /api/bonus/disponiveis/:codFilial */
export interface BonusDisponivel {
  FORNECEDOR: string;
  NUMBONUS: number;
  DATABONUS: string;
  PESOTOTAL: string;
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
export type EtiquetaLidaComLinha = EtiquetaLida & { _rowId: string };

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
