import axios from "axios";
import { normalizarListaAuditorias } from "@/lib/normalizarAuditoria";
import { normalizarEtiquetaLidaApi } from "@/lib/normalizarEtiquetaLida";
import type {
  BiparRequest,
  EtiquetaLida,
  AuditoriaRequest,
  AuditoriaModel,
  BonusDisponivel,
} from "@/types/api";

const api = axios.create({
  baseURL: "http://10.10.10.89:8088",
  timeout: 10000,
});

/** Filial para listagem de bônus (GET /api/bonus/disponiveis/:codFilial). No futuro: filial do usuário logado. */
export const COD_FILIAL_RECEBIMENTO_BONUS = 6;

export async function listarBonusDisponiveis(codFilial: number): Promise<BonusDisponivel[]> {
  const res = await api.get<BonusDisponivel[]>(`/api/bonus/disponiveis/${codFilial}`);
  return res.data;
}

/**
 * GET /api/bonus/:numBonus/produtos
 * O corpo pode ser array direto ou envelope ({ data, produtos, content, … }).
 */
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
  const res = await api.get<unknown>(`/etiqueta-lida/bonus/${numBonus}`);
  const body = res.data;
  if (!Array.isArray(body)) return [];
  return body.map((item) => normalizarEtiquetaLidaApi(item));
}

export async function listarEtiquetas(): Promise<EtiquetaLida[]> {
  const res = await api.get<unknown>("/etiqueta-lida");
  const body = res.data;
  if (!Array.isArray(body)) return [];
  return body.map((item) => normalizarEtiquetaLidaApi(item));
}
