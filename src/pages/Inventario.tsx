import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { carregarInventarioPagina } from "@/services/api";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  R: { label: "RETO", className: "bg-blue-100 text-blue-800 border border-blue-300" },
  RETO: { label: "RETO", className: "bg-blue-100 text-blue-800 border border-blue-300" },
  D: { label: "DOBRADO", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  DOBRADO: { label: "DOBRADO", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  S: { label: "SOLTO", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  SOLTO: { label: "SOLTO", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  P: { label: "SEPARADO", className: "bg-purple-100 text-purple-800 border border-purple-300" },
  SEPARADO: { label: "SEPARADO", className: "bg-purple-100 text-purple-800 border border-purple-300" },
};

const STATUS_OPTIONS = [
  { value: "RETO", label: "RETO" },
  { value: "DOBRADO", label: "DOBRADO" },
  { value: "SOLTO", label: "SOLTO" },
  { value: "SEPARADO", label: "SEPARADO" },
] as const;

type FiltroStatus = "" | (typeof STATUS_OPTIONS)[number]["value"];

function formatarData(iso: string | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function Inventario() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<FiltroStatus>("");

  const {
    data: pagina,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["inventario-pagina", filtro],
    queryFn: () => carregarInventarioPagina(filtro || undefined),
  });

  const resumo = pagina?.resumo;
  const itens = pagina?.itens ?? [];
  const inventarioIndisponivel = pagina && !pagina.endpointInventarioDisponivel;

  const cards = [
    { key: "RETO" as FiltroStatus, label: "RETO", count: resumo?.reto ?? 0, desc: "precisam ser dobrados", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", badge: "bg-blue-600" },
    { key: "DOBRADO" as FiltroStatus, label: "DOBRADO", count: resumo?.dobrado ?? 0, desc: "já foram dobrados", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-600" },
    { key: "SOLTO" as FiltroStatus, label: "SOLTO", count: resumo?.solto ?? 0, desc: "jogados no galpão", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-600" },
    { key: "SEPARADO" as FiltroStatus, label: "SEPARADO", count: resumo?.separado ?? 0, desc: "tem pedido vinculado", bg: "bg-purple-50 border-purple-200", text: "text-purple-700", badge: "bg-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-6xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="industrial-btn-ghost !px-3 !py-2"
            aria-label="Início"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[hsl(222_47%_11%)] sm:text-2xl">
            Inventário — consulta
          </h1>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/inventario/registro")}
              className="industrial-btn-ghost text-sm"
            >
              Registro
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

      <main className="container max-w-6xl space-y-6 py-6">
        {inventarioIndisponivel && (
          <div
            role="status"
            className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">Inventário não disponível neste servidor</p>
            <p className="mt-1 text-amber-900/90">
              As rotas <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">GET /api/inventario</code> e{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">GET /api/inventario/resumo</code> retornaram
              404. Verifique se a API (porta 8088) está no ar.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFiltro(filtro === c.key ? "" : c.key)}
              className={`rounded-xl border-2 p-5 text-left transition-all duration-200 hover:shadow-md ${c.bg} ${
                filtro === c.key ? "ring-2 ring-offset-2 ring-[#1e40af] shadow-md" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold uppercase tracking-wide ${c.text}`}>
                  {c.label}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${c.badge}`}>
                  {c.count}
                </span>
              </div>
              <p className={`mt-2 text-3xl font-bold tabular-nums ${c.text}`}>{c.count} itens</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </button>
          ))}
        </div>

        {filtro && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Filtrando por: <strong>{STATUS_MAP[filtro]?.label ?? filtro}</strong> (GET <code className="rounded bg-muted px-1 font-mono text-xs">?status={filtro}</code>)
            </span>
            <button
              type="button"
              onClick={() => setFiltro("")}
              className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
            >
              Limpar filtro
            </button>
          </div>
        )}

        {isLoading && (
          <p className="text-center text-lg text-muted-foreground">Carregando inventário…</p>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Erro ao carregar inventário.</p>
            <button type="button" onClick={() => refetch()} className="industrial-btn-primary mt-4">
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && itens.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
            {inventarioIndisponivel
              ? "Sem dados de inventário até o backend expor as rotas acima."
              : "Nenhum item encontrado."}
          </div>
        )}

        {!isLoading && !isError && itens.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[960px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">ID</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código de barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Produto</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Série</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Peso</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd Barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Data</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Bônus</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const st = item.status ?? "";
                  const statusInfo = STATUS_MAP[st] ?? {
                    label: st || "—",
                    className: "bg-muted text-muted-foreground",
                  };
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[hsl(214_32%_91%)] last:border-0 even:bg-[hsl(210_40%_98%)]"
                    >
                      <td className="px-4 py-3 tabular-nums font-medium">{item.id}</td>
                      <td className="px-4 py-3 font-mono text-xs md:text-sm">{item.codigoBarras ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{item.codProd ?? "—"}</td>
                      <td className="px-4 py-3">{item.numLote ?? "—"}</td>
                      <td className="px-4 py-3">{item.serie ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{item.pesoTotal ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums">{item.qtBarras ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatarData(item.dtDobra)}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {item.numBonus ?? item.pcBonusc?.numBonus ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Filtros equivalentes:{" "}
          {STATUS_OPTIONS.map((o) => (
            <span key={o.value}>
                <code className="rounded bg-muted px-1 font-mono">status={o.value}</code>
              {o.value !== "SEPARADO" ? " · " : ""}
            </span>
          ))}
        </p>
      </main>
    </div>
  );
}
