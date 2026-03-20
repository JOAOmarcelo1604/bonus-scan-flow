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
