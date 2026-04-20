import axios from "axios";
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
      window.location.href = "/login";
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
  return {
    id: Number(o.id) || 0,
    dataReferencia: String(o.dataReferencia || ""),
    status: String(o.status || ""),
    usuarioAbertura: String(o.usuarioAbertura || ""),
    pesoTotal: Number(o.pesoTotal) || 0,
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

export async function listarInventariosPendentes(): Promise<InventarioModel[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/pendentes`);
  return Array.isArray(res.data) ? res.data.map(normalizarHeaderInventario) : [];
}

export async function aprovarInventario(id: number): Promise<void> {
  await api.post(`${API_INVENTARIO}/${id}/aprovar`);
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
