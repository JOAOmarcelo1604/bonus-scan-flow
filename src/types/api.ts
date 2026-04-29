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
  vias: number;
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
  /** Soma de `etiqueta_lida.pesoTotal` para o bônus. Vem do GET /api/auditoria/pendentes. */
  pesoBipado?: number;
  /** Data/hora em que o bônus foi aprovado ou rejeitado. */
  dataAprovacao?: string;
}

/* ── Dobra de Materiais ── */

export interface DobraBiparRequest {
  codigoBarras: string;
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

export interface InventarioModel {
  id: number;
  dataReferencia: string;
  status: string; // ABERTO, EM_APROVACAO, APROVADO, REJEITADO
  usuarioAbertura: string;
  pesoTotal: number;
  /** Preenchido quando status = APROVADO */
  usuarioAprovacao?: string;
  dataHoraAprovacao?: string;
  /** Nome em PCEMPR (quando o código é matrícula) */
  nomeAbertura?: string;
  nomeAprovacao?: string;
}

/** Novo modelo de item de inventário (V2) */
export interface InventarioItem {
  id: number;
  inventario?: InventarioModel;
  etiqueta?: string;
  codProd: string;
  quantidade: number;
  statusEtiqueta: string; // RETO, DOBRADO, SOLTO, SEPARADO
  peso?: number;
  numPed?: number;
  codigoFuncionario: string;
  dataHoraBipagem: string;
}

/** POST /api/inventario/{id}/registrar-item */
export interface InventarioRegistrarItemRequest {
  codigoBarras?: string;
  status: string;
  codProd?: string;
  quantidade?: number;
  numPed?: number;
}

/* ── Geração de Etiquetas Customizadas ── */

export interface GerarEtiquetaRequest {
  numBonus: number;
  codigoProduto: string;
  tipoGeracao: string;
  pesoOuQuantidade: string;
}

export interface GerarEtiquetaResponse {
  codigoBarrasGerado: string;
  codFornec: number;
}

export interface ImprimirEtiquetaRequest {
  codigo_produto: string;
  numero_bonus: number;
  peso: string | number;
  numero_etiqueta: string;
  impressora: string;
}
export interface AberturaBiparRequest {
  codigoBarras: string;
  qtBarras: number;
}

export interface AberturaRegistrada {
  id: number;
  codigoBarras: string;
  codProd: string;
  numLote: string;
  serie: string;
  qtBarras: number;
  pesoTotal: number;
  status: string;
  dtAbertura: string;
  pcBonusc: { numBonus: number };
}

export interface AberturaBiparResponse {
  aberturaRegistrada: AberturaRegistrada;
  dadosParseados: {
    codigoProduto: string;
    lote: string;
    peso: string;
    serie: string;
  };
}

export type AberturaRegistradaComLinha = AberturaRegistrada & { _rowId: string };

/* ── Separação de Volumes ── */

export interface PedidoSeparacaoItem {
  numPed: number;
  codCli: number;
  cliente: string;
  cidade: string;
  tipoEntrega: string;
  observacao: string;
  codProd: string;
  qt: number;
  pvenda: number;
  descricao: string;
  data: string;
}

export interface SeparacaoGerarRequest {
  numPed: number;
  quantidadeVolumes: number;
  impressora: string;
  usuario: string;
}

export interface VolumeGerado {
  id: number;
  numPed: number;
  numeroVolume: number;
  codigoVolume: string;
  totalVolumes: number;
}

export interface PedidoSeparadoVolume {
  id: number;
  numPed: number;
  numeroVolume: number;
  codigoVolume: string;
  statusSaida: boolean;
  statusInventario: boolean;
  usuarioGeracao: string;
  dataGeracao: string;
}

/* ── Relatórios ── */

export interface RelatorioInventarioBitolaItem {
  dataEntrada: string;
  codigoProduto: string;
  nomeProduto: string;
  codigoBarras: string;
  como: string;
  peso: number | null;
  vias: number;
  milimetragem: string;
  status: 'NEW' | 'OK' | 'SAIU' | 'NAO ENCONTRADO';
}

export interface RelatorioInventarioBitolaResponse {
  itens: RelatorioInventarioBitolaItem[];
  quantidadePrevistaTotal: number;
}

export interface RelatorioAuditoriaEstoqueLinha {
  mes: number;
  data: string;
  bitola: string;
  totalFisico: number;
  totalSistema: number;
  saidaFilial5: number;
  resultado: number;
}

export interface InventarioResumo {
  id: number;
  dataReferencia: string;
  status: string;
  usuarioAbertura: string;
}

export interface EstoqueFisicoItem {
  bitola: string;
  retos: number;
  dobrados: number;
  separados: number;
  soltos: number;
  total: number;
}

export interface ReimpressaoLog {
  id: number;
  codigoBarras: string;
  impressora: string;
  usuario: string;
  motivo: string;
  status: 'SUCESSO' | 'FALHA';
  dtReimpressao: string;
}

export interface SolicitacaoEtiqueta {
  id: number;
  codFuncSolicitacao: number;
  codFuncAprovacao?: number;
  codProd: number;
  qtde?: number;
  peso?: number;
  tipoGeracao: string;
  numBonus: number;
  status: string;
  dtGeracao?: string;
  dtImpressao?: string;
  createdAt: string;
}

