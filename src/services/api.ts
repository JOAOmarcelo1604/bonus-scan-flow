import axios from "axios";
import { extrairNumBonusCodigoBarras, somenteDigitos } from "@/lib/extrairNumBonusCodigoBarras";
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
  InventarioBiparRequest,
  InventarioReprovarRequest,
  InventarioResumo,
  GerarEtiquetaRequest,
  GerarEtiquetaResponse,
  ImprimirEtiquetaRequest,
  AberturaBiparRequest,
  AberturaBiparResponse,
} from "@/types/api";


const TOKEN_KEY = "@expedicao:token";

const api = axios.create({
  baseURL: "",
  timeout: 10000,
});

/* Interceptor: anexa Bearer token em toda requisição autenticada */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Interceptor: redireciona para login em caso de 401/403 */
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

/** Filial para GET /api/bonus/disponiveis e /api/bonus/disponiveis-apos-auditoria. No futuro: filial do usuário logado. */
export const COD_FILIAL_RECEBIMENTO_BONUS = 6;

/** Mesmo código de filial que recebimento; dobra usa GET disponiveis-apos-auditoria. */
export const COD_FILIAL_DOBRA = COD_FILIAL_RECEBIMENTO_BONUS;

/** Bônus abertos para recebimento (backend filtra o que voltou após reprovação, etc.). */
export async function listarBonusDisponiveis(codFilial: number): Promise<BonusDisponivel[]> {
  const res = await api.get<BonusDisponivel[]>(`/api/bonus/disponiveis/${codFilial}`);
  return res.data;
}

export async function listarBonusDisponiveisRecebimento(codFilial: number): Promise<BonusDisponivel[]> {
  return listarBonusDisponiveis(codFilial);
}

/** Bônus liberados para dobra após auditoria (não usar apenas disponiveis nesta tela). */
export async function listarBonusDisponiveisDobra(codFilial: number): Promise<BonusDisponivel[]> {
  const res = await api.get<BonusDisponivel[]>(
    `/api/bonus/disponiveis-apos-auditoria/${codFilial}`,
  );
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
  const res = await api.get<unknown>(`/etiqueta-lida/bonus/${numBonus}`);
  const body = res.data;
  console.log("[listarEtiquetasByBonus] resposta bruta:", body);
  const arr = normalizarArrayRespostaEtiquetas(body);
  return arr.map((item) => normalizarEtiquetaLidaApi(item)).map((e) => {
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

const INVENTARIO_RESUMO_VAZIO: InventarioResumo = {
  reto: 0,
  dobrado: 0,
  solto: 0,
  separado: 0,
};

function normalizarResumoInventario(data: unknown): InventarioResumo {
  if (!data || typeof data !== "object") return INVENTARIO_RESUMO_VAZIO;
  const o = data as Record<string, unknown>;
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  return {
    reto: n(o.reto ?? o.RETO),
    dobrado: n(o.dobrado ?? o.DOBRADO),
    solto: n(o.solto ?? o.SOLTO),
    separado: n(o.separado ?? o.SEPARADO),
  };
}

function normalizarItemInventario(raw: unknown): InventarioItem {
  if (!raw || typeof raw !== "object") return { id: 0 };
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  const numBonus =
    o.numBonus !== undefined
      ? Number(o.numBonus)
      : o.pcBonusc && typeof o.pcBonusc === "object"
        ? Number((o.pcBonusc as Record<string, unknown>).numBonus)
        : undefined;
  return {
    id: Number.isFinite(id) ? id : 0,
    codigoBarras: o.codigoBarras != null ? String(o.codigoBarras) : undefined,
    codProd: o.codProd != null ? String(o.codProd) : undefined,
    numLote: o.numLote != null ? String(o.numLote) : undefined,
    serie: o.serie != null ? String(o.serie) : undefined,
    qtBarras: o.qtBarras !== undefined ? Number(o.qtBarras) : undefined,
    pesoTotal: o.pesoTotal !== undefined ? Number(o.pesoTotal) : undefined,
    status: o.status != null ? String(o.status) : undefined,
    dtDobra: o.dtDobra != null ? String(o.dtDobra) : undefined,
    numBonus: numBonus !== undefined && Number.isFinite(numBonus) ? numBonus : undefined,
    pcBonusc:
      o.pcBonusc && typeof o.pcBonusc === "object"
        ? { numBonus: Number((o.pcBonusc as Record<string, unknown>).numBonus) || 0 }
        : undefined,
    observacao: o.observacao != null ? String(o.observacao) : undefined,
  };
}

function normalizarListaInventario(body: unknown): InventarioItem[] {
  if (Array.isArray(body)) return body.map(normalizarItemInventario);
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const arr = o.data ?? o.content ?? o.itens ?? o.items;
    if (Array.isArray(arr)) return arr.map(normalizarItemInventario);
  }
  return [];
}

export type InventarioPaginaCarregada = {
  resumo: InventarioResumo;
  itens: InventarioItem[];
  /** false quando o backend responde 404 nas rotas de inventário. */
  endpointInventarioDisponivel: boolean;
};

/** GET /api/inventario — lista todos; opcional ?status=RETO */
export async function listarInventario(status?: string): Promise<InventarioItem[]> {
  const url = status
    ? `${API_INVENTARIO}?status=${encodeURIComponent(status)}`
    : API_INVENTARIO;
  const res = await api.get<unknown>(url);
  return normalizarListaInventario(res.data);
}

/** GET /api/inventario/hoje */
export async function listarInventarioHoje(): Promise<InventarioItem[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/hoje`);
  return normalizarListaInventario(res.data);
}

/** GET /api/inventario/resumo */
export async function obterInventarioResumo(): Promise<InventarioResumo> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/resumo`);
  return normalizarResumoInventario(res.data);
}

/** GET /api/inventario/pendentes */
export async function listarInventarioPendentes(): Promise<InventarioItem[]> {
  const res = await api.get<unknown>(`${API_INVENTARIO}/pendentes`);
  return normalizarListaInventario(res.data);
}

function normalizarArrayRespostaEtiquetas(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const arr =
      o.data ?? o.content ?? o.itens ?? o.items ??
      o.etiquetasBipadas ?? o.etiquetas ?? o.result ?? o.results ??
      o.etiquetasLidas ?? o.registros ?? o.rows;
    if (Array.isArray(arr)) return arr;
    for (const v of Object.values(o)) {
      if (Array.isArray(v) && v.length > 0) return v;
    }
  }
  return [];
}

/**
 * O backend de inventário exige `numBonus` para localizar o bônus; este fluxo obtém o valor
 * sem campo na tela: (1) extrai do layout numérico da etiqueta; (2) tenta GET /etiqueta-lida com filtro por barras.
 */
export async function resolverNumBonusParaInventario(codigoBarras: string): Promise<number | null> {
  const cod = codigoBarras.trim();
  if (!cod) return null;

  const extraido = extrairNumBonusCodigoBarras(cod);
  if (extraido != null && extraido > 0) return extraido;

  const dig = somenteDigitos(cod);
  if (!dig) return null;

  const paramVariants = [{ codigoBarras: dig }, { codigobarras: dig }, { barras: dig }] as const;

  for (const params of paramVariants) {
    try {
      const r = await api.get<unknown>("/etiqueta-lida", { params, timeout: 8000 });
      const rows = normalizarArrayRespostaEtiquetas(r.data);
      for (const raw of rows) {
        const e = normalizarEtiquetaLidaApi(raw);
        const cb = somenteDigitos(e.codigoBarras);
        if (cb === dig && e.numBonus > 0) return e.numBonus;
      }
      if (rows.length === 1) {
        const e = normalizarEtiquetaLidaApi(rows[0]);
        if (e.numBonus > 0) return e.numBonus;
      }
    } catch {
      /* endpoint pode não suportar filtro */
    }
  }

  return null;
}

/** POST /api/inventario/bipar */
export async function biparInventario(data: InventarioBiparRequest): Promise<unknown> {
  const body: Record<string, unknown> = {
    codigoBarras: data.codigoBarras,
    status: data.status,
  };
  if (data.numBonus != null && data.numBonus > 0) {
    body.numBonus = data.numBonus;
  }
  const res = await api.post<unknown>(`${API_INVENTARIO}/bipar`, body);
  return res.data;
}

/** POST /api/inventario/enviar-aprovacao */
export async function enviarInventarioAprovacao(): Promise<void> {
  await api.post(`${API_INVENTARIO}/enviar-aprovacao`);
}

/** PUT /api/inventario/aprovar/{id} */
export async function aprovarInventarioItem(id: number): Promise<void> {
  await api.put(`${API_INVENTARIO}/aprovar/${id}`);
}

/** PUT /api/inventario/aprovar-todos */
export async function aprovarInventarioTodos(): Promise<void> {
  await api.put(`${API_INVENTARIO}/aprovar-todos`);
}

/** PUT /api/inventario/reprovar/{id} */
export async function reprovarInventario(id: number, body: InventarioReprovarRequest): Promise<void> {
  await api.put(`${API_INVENTARIO}/reprovar/${id}`, body);
}

/**
 * Carrega GET /api/inventario/resumo + lista (GET /api/inventario ou ?status=).
 * Em 404 devolve vazio e `endpointInventarioDisponivel: false`.
 */
export async function carregarInventarioPagina(status?: string): Promise<InventarioPaginaCarregada> {
  const miss = { any: false };

  const [resumoRaw, listaRaw] = await Promise.all([
    api
      .get<unknown>(`${API_INVENTARIO}/resumo`)
      .then((r) => r.data)
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          miss.any = true;
          return null;
        }
        throw e;
      }),
    api
      .get<unknown>(
        status
          ? `${API_INVENTARIO}?status=${encodeURIComponent(status)}`
          : API_INVENTARIO,
      )
      .then((r) => r.data)
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          miss.any = true;
          return null;
        }
        throw e;
      }),
  ]);

  if (miss.any) {
    return {
      resumo: INVENTARIO_RESUMO_VAZIO,
      itens: [],
      endpointInventarioDisponivel: false,
    };
  }

  return {
    resumo: normalizarResumoInventario(resumoRaw),
    itens: normalizarListaInventario(listaRaw),
    endpointInventarioDisponivel: true,
  };
}

/** Resumo + itens do dia (registro de inventário). */
export async function carregarInventarioRegistroPagina(): Promise<InventarioPaginaCarregada> {
  const miss = { any: false };

  const [resumoRaw, listaRaw] = await Promise.all([
    api
      .get<unknown>(`${API_INVENTARIO}/resumo`)
      .then((r) => r.data)
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          miss.any = true;
          return null;
        }
        throw e;
      }),
    api
      .get<unknown>(`${API_INVENTARIO}/hoje`)
      .then((r) => r.data)
      .catch((e) => {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          miss.any = true;
          return null;
        }
        throw e;
      }),
  ]);

  if (miss.any) {
    return {
      resumo: INVENTARIO_RESUMO_VAZIO,
      itens: [],
      endpointInventarioDisponivel: false,
    };
  }

  return {
    resumo: normalizarResumoInventario(resumoRaw),
    itens: normalizarListaInventario(listaRaw),
    endpointInventarioDisponivel: true,
  };
}

export async function atualizarStatusDobra(id: number, status: string): Promise<void> {
  await api.put(`/api/dobra/status/${id}`, { status });
}

/* ── Geração de Etiquetas Customizadas ── */

export async function gerarEtiquetaCustomizada(data: GerarEtiquetaRequest): Promise<GerarEtiquetaResponse> {
  const res = await api.post<GerarEtiquetaResponse>("/api/bonus/gerar-etiqueta", data);
  return res.data;
}

export async function imprimirEtiqueta(data: ImprimirEtiquetaRequest): Promise<void> {
  await axios.post("https://api.etiquetas.grupopapa.com/v1/etiquetas/imprimir/entrada", data);
}
