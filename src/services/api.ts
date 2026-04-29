import axios from "axios";
import { normalizarListaModulosPermissao } from "@/config/modulosSistema";
import { normalizarListaAuditorias } from "@/lib/normalizarAuditoria";
import { etiquetaPesoFromCache, rememberEtiquetaPeso } from "@/lib/etiquetaPesoCache";
import { normalizarEtiquetaLidaApi } from "@/lib/normalizarEtiquetaLida";
import type {
  BiparRequest,
  EtiquetaLida,
  AuditoriaRequest,
  AuditoriaModel,
  BonusDisponivel,
  DobraBiparRequest,
  DobraBiparResponse,
  InventarioItem,
  InventarioModel,
  InventarioRegistrarItemRequest,
  AberturaBiparRequest,
  AberturaBiparResponse,
  SolicitacaoEtiqueta,
  GerarEtiquetaRequest,
  GerarEtiquetaResponse,
  ImprimirEtiquetaRequest,
  PedidoSeparacaoItem,
  SeparacaoGerarRequest,
  VolumeGerado,
  PedidoSeparadoVolume,
  RelatorioInventarioBitolaResponse,
  RelatorioAuditoriaEstoqueLinha,
  InventarioExpedicaoBiResponse,
  InventarioBiSaidaEtiquetasResponse,
} from "@/types/api";

const TOKEN_KEY = "@expedicao:token";

const api = axios.create({
  baseURL: "",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const COD_FILIAL_RECEBIMENTO_BONUS = 6;
export const COD_FILIAL_DOBRA = COD_FILIAL_RECEBIMENTO_BONUS;

export async function listarBonusDisponiveis(codFilial: number): Promise<BonusDisponivel[]> {
  const res = await api.get<BonusDisponivel[]>(`/api/bonus/disponiveis/${codFilial}`);
  return res.data;
}

export async function listarBonusDisponiveisRecebimento(codFilial: number): Promise<BonusDisponivel[]> {
  return listarBonusDisponiveis(codFilial);
}

export async function listarBonusDisponiveisDobra(codFilial: number): Promise<BonusDisponivel[]> {
  const res = await api.get<BonusDisponivel[]>(`/api/bonus/disponiveis-apos-auditoria/${codFilial}`);
  return res.data;
}

export async function listarProdutosBonus(numBonus: number): Promise<unknown> {
  const res = await api.get<unknown>(`/api/bonus/${numBonus}/produtos`);
  return res.data;
}

export async function biparEtiqueta(data: BiparRequest): Promise<EtiquetaLida> {
  const res = await api.post<unknown>("/etiqueta-lida/bipar", data);
  const e = normalizarEtiquetaLidaApi(res.data);
  if (!e.codigoBarras.trim()) {
    e.codigoBarras = data.codigoBarras.trim();
  }
  rememberEtiquetaPeso(data.numBonus, e.codigoBarras, e.peso);
  return e;
}

export async function enviarAuditoria(data: AuditoriaRequest): Promise<AuditoriaModel> {
  const res = await api.post<AuditoriaModel>("/api/auditoria/enviar", data);
  return res.data;
}

export async function listarAuditorias(): Promise<AuditoriaModel[]> {
  const res = await api.get<unknown>("/api/auditoria");
  return normalizarListaAuditorias(res.data);
}

export async function listarAuditoriasPendentes(): Promise<AuditoriaModel[]> {
  const res = await api.get<unknown>("/api/auditoria/pendentes");
  return normalizarListaAuditorias(res.data);
}

export async function aprovarAuditoria(id: number): Promise<void> {
  await api.put(`/api/auditoria/aprovar/${id}`);
}

export async function rejeitarAuditoria(id: number, observacao: string): Promise<void> {
  await api.put(`/api/auditoria/rejeitar/${id}`, { observacao });
}

export async function listarEtiquetasByBonus(numBonus: number): Promise<EtiquetaLida[]> {
  const res = await api.get<any>(`/etiqueta-lida/bonus/${numBonus}`);
  const data = res.data;
  
  // O backend retorna { etiquetasBipadas: [...], total: X }
  const etiquetas = Array.isArray(data) ? data : data?.etiquetasBipadas || [];

  if (!Array.isArray(etiquetas)) return [];

  return etiquetas.map((item: any) => normalizarEtiquetaLidaApi(item)).map((e) => {
    if ((e.peso ?? "").trim()) return e;
    const cached = etiquetaPesoFromCache(numBonus, e.codigoBarras);
    return cached ? { ...e, peso: cached } : e;
  });
}

export async function listarEtiquetas(): Promise<EtiquetaLida[]> {
  const res = await api.get<unknown>("/etiqueta-lida");
  const body = res.data;
  if (!Array.isArray(body)) return [];
  return body.map((item) => normalizarEtiquetaLidaApi(item));
}

/* ── Dobra de Materiais ── */
export async function verificarEtiquetaDobra(codigoBarras: string): Promise<void> {
  await api.get("/api/dobra/verificar", { params: { codigoBarras } });
}
export async function biparDobra(data: DobraBiparRequest): Promise<DobraBiparResponse> {
  const res = await api.post<DobraBiparResponse>("/api/dobra/bipar", data);
  return res.data;
}

/* ── Abertura de Materiais ── */
export async function verificarEtiquetaAbertura(codigoBarras: string): Promise<void> {
  await api.get("/api/abertura/verificar", { params: { codigoBarras } });
}
export async function biparAbertura(data: AberturaBiparRequest): Promise<AberturaBiparResponse> {
  const res = await api.post<AberturaBiparResponse>("/api/abertura/bipar", data);
  return res.data;
}

/* ── Inventário ── */
const API_INVENTARIO = "/api/inventario";

function normalizarItemInventario(raw: unknown): InventarioItem {
  if (!raw || typeof raw !== "object") return { id: 0, codProd: "", quantidade: 0, statusEtiqueta: "", codigoFuncionario: "", dataHoraBipagem: "" };
  const o = raw as Record<string, unknown>;
  return {
    id: Number(o.id) || 0,
    etiqueta: o.etiqueta != null ? String(o.etiqueta) : undefined,
    codProd: String(o.codProd || ""),
    quantidade: Number(o.quantidade) || 0,
    statusEtiqueta: String(o.statusEtiqueta || ""),
    peso: o.peso != null ? Number(o.peso) : undefined,
    numPed: o.numPed != null ? Number(o.numPed) : undefined,
    codigoFuncionario: String(o.codigoFuncionario || ""),
    dataHoraBipagem: String(o.dataHoraBipagem || ""),
    inventario: o.inventario as any,
  };
}

function normalizarHeaderInventario(raw: unknown): InventarioModel {
  const o = raw as Record<string, unknown>;
  const dh = o.dataHoraAprovacao;
  let dataHoraAprovacao: string | undefined;
  if (typeof dh === "string") dataHoraAprovacao = dh;
  else if (Array.isArray(dh) && dh.length >= 6) {
    const [y, m, d, h, min, sec] = dh as number[];
    dataHoraAprovacao = new Date(y, m - 1, d, h, min, sec).toISOString();
  }
  return {
    id: Number(o.id) || 0,
    dataReferencia: String(o.dataReferencia || ""),
    status: String(o.status || ""),
    usuarioAbertura: String(o.usuarioAbertura || ""),
    pesoTotal: Number(o.pesoTotal) || 0,
    usuarioAprovacao: o.usuarioAprovacao != null && String(o.usuarioAprovacao) !== "" ? String(o.usuarioAprovacao) : undefined,
    dataHoraAprovacao,
    nomeAbertura: o.nomeAbertura != null && String(o.nomeAbertura) !== "" ? String(o.nomeAbertura).trim() : undefined,
    nomeAprovacao: o.nomeAprovacao != null && String(o.nomeAprovacao) !== "" ? String(o.nomeAprovacao).trim() : undefined,
  };
}

export async function obterInventarioAtivo(): Promise<InventarioModel | null> {
  const res = await api.get<InventarioModel>(`${API_INVENTARIO}/ativo`);
  if (res.status === 204 || !res.data) return null;
  return normalizarHeaderInventario(res.data);
}

export async function abrirInventario(usuario: string): Promise<InventarioModel> {
  const res = await api.post<InventarioModel>(`${API_INVENTARIO}/abrir`, { usuario });
  return normalizarHeaderInventario(res.data);
}

export async function registrarItemInventario(id: number, data: InventarioRegistrarItemRequest, usuario: string): Promise<InventarioItem> {
  const res = await api.post<unknown>(`${API_INVENTARIO}/${id}/registrar-item`, data, { params: { usuario } });
  return normalizarItemInventario(res.data);
}

export async function listarItensInventario(id: number): Promise<InventarioItem[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/${id}/itens`);
  return Array.isArray(res.data) ? res.data.map(normalizarItemInventario) : [];
}

export async function listarInventariosHoje(): Promise<InventarioModel[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/hoje`);
  return Array.isArray(res.data) ? res.data.map(normalizarHeaderInventario) : [];
}

export async function enviarInventarioAprovacao(id: number): Promise<void> {
  await api.post(`${API_INVENTARIO}/${id}/enviar-aprovacao`);
}

export async function listarTodosInventarios(): Promise<InventarioModel[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/todos`);
  return Array.isArray(res.data) ? res.data.map(normalizarHeaderInventario) : [];
}

export async function buscarInventarioBiExpedicao(): Promise<InventarioExpedicaoBiResponse> {
  const res = await api.get<InventarioExpedicaoBiResponse>(`${API_INVENTARIO}/bi/expedicao`);
  return res.data;
}

export async function buscarInventarioBiSaidaDetalhes(
  inventarioAnteriorId: number,
  inventarioAtualId: number,
): Promise<InventarioBiSaidaEtiquetasResponse> {
  const res = await api.get<InventarioBiSaidaEtiquetasResponse>(`${API_INVENTARIO}/bi/expedicao/saida-detalhes`, {
    params: { anterior: inventarioAnteriorId, atual: inventarioAtualId },
  });
  return res.data;
}

export async function listarInventariosPendentes(): Promise<InventarioModel[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/pendentes`);
  return Array.isArray(res.data) ? res.data.map(normalizarHeaderInventario) : [];
}

export async function aprovarInventario(id: number, usuario: string): Promise<void> {
  await api.post(`${API_INVENTARIO}/${id}/aprovar`, undefined, { params: { usuario } });
}

export async function reprovarInventario(id: number): Promise<void> {
  await api.post(`${API_INVENTARIO}/${id}/reprovar`);
}

/** Agregador para página de registro */
export async function carregarInventarioRegistroPagina(): Promise<any> {
    const ativo = await obterInventarioAtivo();
    if (!ativo) return { resumo: { reto: 0, dobrado: 0, solto: 0, separado: 0 }, itens: [], ativo: null };
    const itens = await listarItensInventario(ativo.id);
    return {
        ativo,
        itens,
        resumo: {
            reto: itens.filter(i => i.statusEtiqueta === 'RETO').length,
            dobrado: itens.filter(i => i.statusEtiqueta === 'DOBRADO').length,
            solto: itens.filter(i => i.statusEtiqueta === 'SOLTO').length,
            separado: itens.filter(i => i.statusEtiqueta === 'SEPARADO').length,
        }
    };
}

/** Agregador para página monitor (Histórico) */
export async function carregarInventarioPaginaMonitor(): Promise<any> {
    const invs = await listarInventariosHoje();
    return { invs };
}

/* ── Geração de Etiquetas Customizadas ── */
export async function gerarEtiquetaCustomizada(data: GerarEtiquetaRequest): Promise<GerarEtiquetaResponse> {
  const res = await api.post<GerarEtiquetaResponse>("/api/bonus/gerar-etiqueta", data);
  return res.data;
}
export async function imprimirEtiqueta(data: ImprimirEtiquetaRequest): Promise<void> {
  await axios.post("https://api.etiquetas.grupopapa.com/v1/etiquetas/imprimir/entrada", data);
}

/* ── Separação de Volumes ── */

export async function consultarPedidoSeparacao(numPed: number): Promise<PedidoSeparacaoItem[]> {
  const res = await api.get<PedidoSeparacaoItem[]>(`/api/separacao/pedido/${numPed}`);
  return res.data;
}

export async function gerarVolumesSeparacao(data: SeparacaoGerarRequest): Promise<VolumeGerado[]> {
  const res = await api.post<VolumeGerado[]>("/api/separacao/gerar-volumes", data);
  return res.data;
}

export async function listarVolumesSeparacao(numPed: number): Promise<PedidoSeparadoVolume[]> {
  const res = await api.get<PedidoSeparadoVolume[]>(`/api/separacao/volumes/${numPed}`);
  return res.data;
}

/* ── Solicitação de Etiquetas ── */
export async function criarSolicitacaoEtiqueta(data: Partial<SolicitacaoEtiqueta>): Promise<SolicitacaoEtiqueta> {
  const res = await api.post<SolicitacaoEtiqueta>("/api/solicitacao-etiqueta", data);
  return res.data;
}
export async function listarSolicitacoesPendentes(): Promise<SolicitacaoEtiqueta[]> {
  const res = await api.get<SolicitacaoEtiqueta[]>("/api/solicitacao-etiqueta/pendentes");
  return res.data;
}
export async function concluirSolicitacaoEtiqueta(id: number): Promise<void> {
  await api.put(`/api/solicitacao-etiqueta/concluir/${id}`);
}

/* ── Controle de Acesso ── */

export interface UsuarioWinthor {
  matricula: number;
  nome: string;
}

export async function listarUsuariosWinthor(): Promise<UsuarioWinthor[]> {
  const res = await api.get<UsuarioWinthor[]>("/api/permissoes/usuarios");
  return res.data;
}

export async function listarModulosUsuario(matricula: number): Promise<string[]> {
  const res = await api.get<string[]>(`/api/permissoes/${matricula}`);
  return normalizarListaModulosPermissao(res.data ?? []);
}

export async function salvarModulosUsuario(matricula: number, modulos: string[]): Promise<void> {
  await api.post(`/api/permissoes/${matricula}`, modulos);
}

/* ── Relatórios ── */

export async function listarBitolasSeparacao(): Promise<string[]> {
  const res = await api.get<string[]>("/api/relatorio/bitolas");
  return res.data;
}

export async function buscarRelatorioInventarioBitola(bitola: string): Promise<RelatorioInventarioBitolaResponse> {
  const res = await api.get<RelatorioInventarioBitolaResponse>("/api/relatorio/inventario-bitola", {
    params: { bitola },
  });
  const d = res.data;
  return {
    itens: Array.isArray(d?.itens) ? d.itens : [],
    quantidadePrevistaTotal: typeof d?.quantidadePrevistaTotal === "number" ? d.quantidadePrevistaTotal : 0,
  };
}

export async function buscarRelatorioAuditoriaEstoque(
  bitola: string,
  ano: number,
  mes: number,
): Promise<RelatorioAuditoriaEstoqueLinha[]> {
  const res = await api.get<RelatorioAuditoriaEstoqueLinha[]>("/api/relatorio/auditoria-estoque", {
    params: { bitola, ano, mes },
  });
  return res.data;
}

export async function reimprimirEtiqueta(
  codigoBarras: string,
  usuario?: string,
  motivo?: string
): Promise<void> {
  await api.post("/api/reimpressao", {
    codigoBarras,
    impressora: "ZD230",
    usuario,
    motivo,
  });
}

export async function historicoReimpressao(codigoBarras: string): Promise<import("@/types/api").ReimpressaoLog[]> {
  const res = await api.get<import("@/types/api").ReimpressaoLog[]>(`/api/reimpressao/historico/${codigoBarras}`);
  return res.data;
}

export async function buscarEtiquetaPorCodigoBarras(codigoBarras: string): Promise<EtiquetaLida | null> {
  try {
    const res = await api.get<any>(`/etiqueta-lida/buscar`, { params: { codigoBarras } });
    return normalizarEtiquetaLidaApi(res.data);
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}
