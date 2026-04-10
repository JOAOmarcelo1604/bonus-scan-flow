import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import {
  biparInventario,
  carregarInventarioRegistroPagina,
  enviarInventarioAprovacao,
  resolverNumBonusParaInventario,
} from "@/services/api";
import { playBeep } from "@/lib/beep";

const STATUS_BIPAGEM = [
  { value: "RETO", label: "RETO" },
  { value: "DOBRADO", label: "DOBRADO" },
  { value: "SOLTO", label: "SOLTO" },
  { value: "SEPARADO", label: "SEPARADO" },
] as const;

const REGISTRO_KEY = ["inventario-registro"] as const;

function formatarData(iso: string | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function labelStatus(s: string | undefined) {
  if (!s) return "—";
  const u = s.toUpperCase();
  if (u === "R" || u === "RETO") return "RETO";
  if (u === "D" || u === "DOBRADO") return "DOBRADO";
  if (u === "S" || u === "SOLTO") return "SOLTO";
  if (u === "P" || u === "SEPARADO") return "SEPARADO";
  return s;
}

export default function InventarioRegistro() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codigoBarras, setCodigoBarras] = useState("");
  const [statusBip, setStatusBip] = useState<string>("RETO");
  const [bipando, setBipando] = useState(false);
  const barrasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barrasRef.current?.focus();
  }, []);

  const {
    data: pagina,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: REGISTRO_KEY,
    queryFn: carregarInventarioRegistroPagina,
  });

  const resumo = pagina?.resumo;
  const itens = pagina?.itens ?? [];
  const indisponivel = pagina && !pagina.endpointInventarioDisponivel;

  const enviarMut = useMutation({
    mutationFn: enviarInventarioAprovacao,
    onSuccess: () => {
      toast.success("Enviado para aprovação.");
      queryClient.invalidateQueries({ queryKey: REGISTRO_KEY });
      queryClient.invalidateQueries({ queryKey: ["inventario-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? typeof err.response?.data === "string"
          ? err.response.data
          : (err.response?.data as { message?: string })?.message
        : null;
      toast.error(msg || "Não foi possível enviar para aprovação.");
    },
  });

  const handleBipar = useCallback(async () => {
    const cod = codigoBarras.trim();
    if (!cod) {
      toast.error("Informe o código de barras.");
      return;
    }

    setBipando(true);
    try {
      const numBonus = await resolverNumBonusParaInventario(cod);
      if (numBonus == null || numBonus <= 0) {
        playBeep(false);
        toast.error(
          "Não foi possível identificar o bônus desta etiqueta. Confira se ela já teve entrada no sistema e se o leitor leu o código completo.",
        );
        return;
      }

      await biparInventario({
        codigoBarras: cod,
        status: statusBip,
        numBonus,
      });
      setCodigoBarras("");
      playBeep(true);
      toast.success("Etiqueta bipada no inventário.");
      queryClient.invalidateQueries({ queryKey: REGISTRO_KEY });
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
    } catch (err: unknown) {
      playBeep(false);
      const ax = err as { response?: { data?: unknown; status?: number } };
      const raw = ax?.response?.data;
      let msg = "Erro ao bipar";
      if (typeof raw === "string" && raw.trim()) msg = raw;
      else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        const detail = r.message ?? r.error ?? r.erro ?? r.detail;
        if (detail) msg = String(detail);
      }
      if (ax?.response?.status) msg += ` (HTTP ${ax.response.status})`;
      toast.error(msg);
    } finally {
      setBipando(false);
      barrasRef.current?.focus();
    }
  }, [codigoBarras, statusBip, queryClient]);

  const cards = [
    { label: "RETO", count: resumo?.reto ?? 0, bg: "bg-blue-50 border-blue-200", text: "text-blue-700", badge: "bg-blue-600" },
    { label: "DOBRADO", count: resumo?.dobrado ?? 0, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-600" },
    { label: "SOLTO", count: resumo?.solto ?? 0, bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-600" },
    { label: "SEPARADO", count: resumo?.separado ?? 0, bg: "bg-purple-50 border-purple-200", text: "text-purple-700", badge: "bg-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="industrial-btn-ghost shrink-0 !px-3 !py-2"
            aria-label="Início"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[hsl(222_47%_11%)] sm:text-2xl">
            Registro de inventário
          </h1>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/inventario")}
              className="industrial-btn-ghost text-sm"
            >
              Consulta
            </button>
            <button
              type="button"
              onClick={() => navigate("/inventario/aprovacao")}
              className="industrial-btn-ghost text-sm"
            >
              Aprovação
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        {indisponivel && (
          <div
            role="status"
            className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">Inventário não disponível neste servidor</p>
            <p className="mt-1 text-amber-900/90">
              As rotas <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">GET /api/inventario/resumo</code> e{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">GET /api/inventario/hoje</code> retornaram 404.
            </p>
          </div>
        )}

        <section className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[hsl(222_47%_11%)]">Bipar etiqueta</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Escolha o status uma vez; o foco fica no código de barras para bipar em sequência (Enter confirma). O
            sistema identifica o bônus a partir da própria etiqueta (ou da etiqueta já cadastrada no recebimento).
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-[220px]">
              <label className="mb-1 block text-sm font-semibold text-[hsl(215_16%_47%)]">Status</label>
              <select
                value={statusBip}
                onChange={(e) => {
                  setStatusBip(e.target.value);
                  requestAnimationFrame(() => barrasRef.current?.focus());
                }}
                className="industrial-input w-full"
                disabled={bipando}
              >
                {STATUS_BIPAGEM.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-semibold text-[hsl(215_16%_47%)]">
                Código de barras
              </label>
              <input
                ref={barrasRef}
                type="text"
                inputMode="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBipar();
                  }
                }}
                className="industrial-input w-full font-mono text-base"
                placeholder="Bipe ou cole a etiqueta"
                autoComplete="off"
                spellCheck={false}
                disabled={bipando}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={bipando}
              onClick={handleBipar}
              className="industrial-btn-primary"
            >
              {bipando ? "Bipando…" : "Bipar"}
            </button>
            <button
              type="button"
              disabled={enviarMut.isPending || indisponivel}
              onClick={() => enviarMut.mutate()}
              className="industrial-btn-success"
            >
              {enviarMut.isPending ? "Enviando…" : "Enviar para aprovação"}
            </button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border-2 p-4 ${c.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold uppercase ${c.text}`}>{c.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${c.badge}`}>
                  {c.count}
                </span>
              </div>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${c.text}`}>{c.count}</p>
            </div>
          ))}
        </div>

        {isLoading && (
          <p className="text-center text-lg text-muted-foreground">Carregando itens de hoje…</p>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Erro ao carregar dados.</p>
            <button type="button" onClick={() => refetch()} className="industrial-btn-primary mt-4">
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && itens.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
            {indisponivel ? "Sem dados até o backend responder." : "Nenhum item registrado hoje."}
          </div>
        )}

        {!isLoading && !isError && itens.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Código de barras</th>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 font-semibold">Bônus</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[hsl(214_32%_91%)] last:border-0 even:bg-[hsl(210_40%_98%)]"
                  >
                    <td className="px-4 py-3 tabular-nums font-medium">{item.id}</td>
                    <td className="px-4 py-3 font-mono text-xs md:text-sm">{item.codigoBarras ?? "—"}</td>
                    <td className="px-4 py-3">{item.codProd ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{item.numBonus ?? item.pcBonusc?.numBonus ?? "—"}</td>
                    <td className="px-4 py-3">{labelStatus(item.status)}</td>
                    <td className="px-4 py-3">{formatarData(item.dtDobra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
