import type { AuditoriaModel } from "@/types/api";

function normKey(k: string) {
  return k
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s_]+/g, "");
}

function toMap(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [normKey(k), v]),
  );
}

function pickInt(m: Record<string, unknown>, aliases: string[]): number {
  for (const a of aliases) {
    const v = m[normKey(a)];
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function pickStr(m: Record<string, unknown>, aliases: string[]): string {
  for (const a of aliases) {
    const v = m[normKey(a)];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/** Converte item do GET /api/auditoria para `AuditoriaModel` (camelCase / PascalCase / snake_case). */
export function normalizarAuditoriaItem(raw: unknown): AuditoriaModel | null {
  if (!raw || typeof raw !== "object") return null;

  const top = raw as Record<string, unknown>;
  const flat: Record<string, unknown> = { ...top };

  const nestedKeys = ["bonus", "Bonus", "pcBonuscModel", "PcBonuscModel", "recebimentoBonus", "RecebimentoBonus"];
  for (const key of nestedKeys) {
    const nested = top[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      Object.assign(flat, nested as Record<string, unknown>);
      break;
    }
  }

  const m = toMap(flat);

  const id = pickInt(m, ["id", "idauditoria", "auditid", "codigo"]);
  const numBonus = pickInt(m, [
    "numbonus",
    "num_bonus",
    "numerobonus",
    "numerodobonus",
    "codbonus",
    "cod_bonus",
    "nrbonus",
    "bonusnumero",
    "bonus",
    "nrbônus",
  ]);

  const pesoBipado = pickInt(m, [
    "pesobipado",
    "peso_bipado",
    "pesototalbipado",
    "somapeso",
    "totalpeso",
  ]);

  let dataAprovacaoRaw: any = undefined;
  for (const k of ["dataaprovacao", "data_aprovacao", "dtaprovacao", "dt_aprovacao"]) {
    if (m[k] != null) {
      dataAprovacaoRaw = m[k];
      break;
    }
  }

  let dataAprovacaoStr: string | undefined = undefined;
  if (Array.isArray(dataAprovacaoRaw) && dataAprovacaoRaw.length >= 3) {
    // Jackson serializa LocalDateTime como array [year, month, day, hour, minute, second, nano]
    const [y, mo, d, h = 0, min = 0, s = 0] = dataAprovacaoRaw;
    dataAprovacaoStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (typeof dataAprovacaoRaw === "number") {
    // Timestamp numérico em ms (ex: retorno de java.sql.Timestamp via query nativa)
    const d = new Date(dataAprovacaoRaw);
    if (!isNaN(d.getTime())) dataAprovacaoStr = d.toISOString();
  } else if (dataAprovacaoRaw != null && String(dataAprovacaoRaw).trim() !== "") {
    dataAprovacaoStr = String(dataAprovacaoRaw).trim();
  }

  return {
    id,
    numBonus,
    nf: pickStr(m, ["nf", "notafiscal", "nrnf", "numeronf", "documento"]),
    status: pickStr(m, ["status", "situacao", "state"]),
    observacao: pickStr(m, ["observacao", "obs", "comentario", "descricao"]),
    pesoBipado: pesoBipado || undefined,
    dataAprovacao: dataAprovacaoStr,
  };
}

export function normalizarListaAuditorias(payload: unknown): AuditoriaModel[] {
  let list: unknown = payload;
  if (list && typeof list === "object" && !Array.isArray(list)) {
    const o = list as Record<string, unknown>;
    list = o.data ?? o.Data ?? o.items ?? o.Items ?? o.content ?? o.Content ?? o.result ?? o.Result ?? list;
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => normalizarAuditoriaItem(item))
    .filter((row): row is AuditoriaModel => row != null);
}
