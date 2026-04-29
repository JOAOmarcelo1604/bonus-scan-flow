import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { buscarRelatorioInventarioBitola, listarBitolasSeparacao } from "@/services/api";
import type { RelatorioInventarioBitolaItem } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { BotaoReimprimir } from "@/components/BotaoReimprimir";

/** Não encontrado no topo; OK por último; demais situações no meio. */
function prioridadeOrdenacaoRelatorio(status: string): number {
  if (status === "NAO ENCONTRADO") return 0;
  if (status === "OK") return 2;
  return 1;
}

const STATUS_CONFIG: Record<string, { label: string; printClass: string; badgeClass: string }> = {
  OK:               { label: "OK",             printClass: "",          badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  NEW:              { label: "Novo hoje",      printClass: "",          badgeClass: "bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300"  },
  SAIU:             { label: "Saiu",           printClass: "",          badgeClass: "bg-gray-100  text-gray-600  dark:bg-gray-800     dark:text-gray-400"  },
  "NAO ENCONTRADO": { label: "Não encontrado", printClass: "font-bold", badgeClass: "bg-red-100  text-red-800   dark:bg-red-900/30   dark:text-red-300"   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badgeClass: "bg-gray-100 text-gray-700", printClass: "" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium print:rounded-none print:bg-transparent print:px-0 print:font-normal print:text-black ${cfg.badgeClass} ${cfg.printClass}`}>
      {cfg.label}
    </span>
  );
}

function ViasBadge({ vias }: { vias: number }) {
  if (!vias || vias <= 1) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 print:bg-transparent print:text-black">
      {vias}ª via
    </span>
  );
}


function Resumo({ itens, quantidadePrevistaTotal }: { itens: RelatorioInventarioBitolaItem[]; quantidadePrevistaTotal: number }) {
  const contagem = itens.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const pesoTotal = itens.reduce((sum, i) => sum + (i.peso ?? 0), 0);
  const totalEtiquetas = itens.length;
  const naoEncontrado = contagem["NAO ENCONTRADO"] ?? 0;
  const encontradas = totalEtiquetas - naoEncontrado;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 print:flex print:flex-wrap print:gap-6 print:border print:border-black print:p-3">
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
        <div key={key} className="rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
          <p className="text-xs text-muted-foreground print:text-black">{cfg.label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground print:text-xl print:text-black">{contagem[key] ?? 0}</p>
        </div>
      ))}
      <div
        className={`rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:p-0 ${
          naoEncontrado > 0 ? "border-amber-400/80 ring-1 ring-amber-400/40" : "border-border"
        }`}
      >
        <p className="text-xs text-muted-foreground print:text-black">Encontradas / Total</p>
        <p className="mt-1 text-2xl font-bold text-foreground print:text-xl print:text-black tabular-nums">
          {encontradas}/{totalEtiquetas}
        </p>
        {naoEncontrado > 0 && (
          <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-200 print:text-black">
            Faltam {naoEncontrado} etiqueta{naoEncontrado !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
        <p className="text-xs text-muted-foreground print:text-black">Peso total (kg)</p>
        <p className="mt-1 text-2xl font-bold text-foreground print:text-xl print:text-black">
          {pesoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
        <p className="text-xs text-muted-foreground print:text-black">Qtd. prevista (barras)</p>
        <p className="mt-1 text-2xl font-bold text-foreground print:text-xl print:text-black">
          {quantidadePrevistaTotal.toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

export default function RelatorioInventarioBitola() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [bitolaQuery, setBitolaQuery] = useState<string | null>(null);

  const { data: bitolas = [], isLoading: carregandoBitolas } = useQuery({
    queryKey: ["bitolas-separacao"],
    queryFn: listarBitolasSeparacao,
    staleTime: 5 * 60 * 1000,
  });

<<<<<<< HEAD
  const bitolasOrdenadas = useMemo(() => {
    return [...bitolas].sort((a, b) => {
      const na = Number(String(a).trim().replace(",", "."));
      const nb = Number(String(b).trim().replace(",", "."));
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb || String(a).localeCompare(String(b), "pt-BR");
      if (Number.isFinite(na)) return -1;
      if (Number.isFinite(nb)) return 1;
      return String(a).localeCompare(String(b), "pt-BR");
    });
  }, [bitolas]);

  const { data, isFetching, isError } = useQuery({
=======
  const { data = [], isFetching, isError, error } = useQuery({
>>>>>>> b0946a4c20d01f1d2573d4cc3fe2da0f4d7dab1e
    queryKey: ["relatorio-inventario-bitola", bitolaQuery],
    queryFn: () => buscarRelatorioInventarioBitola(bitolaQuery!),
    enabled: bitolaQuery !== null,
    retry: false,
  });

  useEffect(() => {
    if (error) toast.error("Erro ao carregar relatório.");
  }, [error]);

  const podeImprimir = !isFetching && !isError && data.length > 0;
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  function handleReimpressaoSucesso() {
    // Invalida a query para recarregar os dados (vias atualizado)
    queryClient.invalidateQueries({ queryKey: ["relatorio-inventario-bitola", bitolaQuery] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background print:bg-white">

      {/* Cabeçalho de tela (oculto na impressão) */}
      <header className="border-b border-border bg-card shadow-sm print:hidden">
        <div className="container flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Inventário por Bitola</h1>
              <p className="text-sm text-muted-foreground">Selecione uma bitola para carregar o relatório</p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            disabled={!podeImprimir}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
        </div>
      </header>

      {/* Cabeçalho de impressão (visível só ao imprimir) */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold text-black">Relatório de Inventário por Bitola</h1>
        {bitolaQuery && (
          <p className="text-sm text-black">
            Bitola: <strong>{bitolaQuery} mm</strong> &nbsp;·&nbsp; Data: {dataHoje} &nbsp;·&nbsp; Total: {itens.length}{" "}
            etiquetas &nbsp;·&nbsp; Qtd. prevista: {quantidadePrevistaTotal.toLocaleString("pt-BR")}
          </p>
        )}
        <hr className="mt-2 border-black" />
      </div>

      <main className="container flex-1 space-y-6 py-6 print:py-2 print:space-y-4">

        {/* Seleção de bitola (oculta na impressão) */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm print:hidden">
          <p className="mb-3 text-sm font-medium text-foreground">Selecione a bitola:</p>
          {carregandoBitolas ? (
            <span className="text-xs text-muted-foreground">Carregando…</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bitolasOrdenadas.map(b => (
                <button
                  key={b}
                  onClick={() => setBitolaQuery(b)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    bitolaQuery === b
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {b} mm
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carregando */}
        {isFetching && (
          <div className="flex items-center justify-center py-16 text-muted-foreground print:hidden">
            <svg className="mr-2 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Carregando relatório…
          </div>
        )}

        {/* Erro */}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400 print:hidden">
            Erro ao carregar os dados. Tente novamente.
          </div>
        )}

        {/* Resultado */}
        {bitolaQuery && !isFetching && !isError && (
          <>
            <Resumo itens={itens} quantidadePrevistaTotal={quantidadePrevistaTotal} />

            {/* Tabela */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm print:overflow-visible print:rounded-none print:border-black print:shadow-none">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground print:bg-gray-200 print:text-black">
                    <th className="px-4 py-3 print:px-2 print:py-1">Data entrada</th>
                    <th className="px-4 py-3 print:px-2 print:py-1">Cód. produto</th>
                    <th className="px-4 py-3 print:px-2 print:py-1">Produto</th>
                    <th className="px-4 py-3 print:px-2 print:py-1">Código de barras</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Peso (kg)</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-center">Vias</th>
                    <th className="px-4 py-3 print:px-2 print:py-1">Situação</th>
                    <th className="px-4 py-3 print:hidden">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-gray-300">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado para esta bitola.
                      </td>
                    </tr>
                  ) : (
                    itensOrdenados.map((item, idx) => (
                      <tr
                        key={`${item.codigoBarras}-${idx}`}
                        className={`transition-colors hover:bg-muted/30 print:hover:bg-transparent ${
                          item.status === "NAO ENCONTRADO"
                            ? "bg-red-50/60 dark:bg-red-950/10 print:bg-red-50"
                            : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-muted-foreground print:px-2 print:py-1 print:text-black">
                          {item.dataEntrada ?? "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs print:px-2 print:py-1 print:text-black">{item.codigoProduto}</td>
                        <td className="px-4 py-2 print:px-2 print:py-1 print:text-black">{item.nomeProduto}</td>
                        <td className="px-4 py-2 font-mono text-xs print:px-2 print:py-1 print:text-black">
                          {item.codigoBarras}
                          <ViasBadge vias={item.vias} />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">
                          {item.peso != null
                            ? item.peso.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-center tabular-nums print:px-2 print:py-1 print:text-black">
                          {item.vias ?? 1}
                        </td>
                        <td className="px-4 py-2 print:px-2 print:py-1">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-2 print:hidden">
                          {item.status === "NAO ENCONTRADO" && (
                            <BotaoReimprimir
                              codigoBarras={item.codigoBarras}
                              vias={item.vias ?? 1}
                              usuario={user?.userCode ?? ""}
                              onSuccess={handleReimpressaoSucesso}
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-right text-xs text-muted-foreground print:hidden">
              {itens.length} etiquetas · {bitolaQuery} mm · Qtd. prevista: {quantidadePrevistaTotal.toLocaleString("pt-BR")}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
