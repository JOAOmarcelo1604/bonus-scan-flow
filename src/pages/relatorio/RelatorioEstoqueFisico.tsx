import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listarInventariosPorData, buscarEstoqueFisico } from "@/services/api";
import type { EstoqueFisicoItem, InventarioResumo } from "@/types/api";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  EM_APROVACAO: "Em aprovação",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

function toISO(dataBR: string | undefined): string {
  if (!dataBR) return "";
  // se já estiver no formato YYYY-MM-DD retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataBR)) return dataBR;
  const [d, m, y] = dataBR.split("/");
  return `${y}-${m}-${d}`;
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function Totais({ linhas }: { linhas: EstoqueFisicoItem[] }) {
  const tot = linhas.reduce(
    (acc, l) => ({
      retos: acc.retos + l.retos,
      dobrados: acc.dobrados + l.dobrados,
      separados: acc.separados + l.separados,
      soltos: acc.soltos + l.soltos,
      total: acc.total + l.total,
    }),
    { retos: 0, dobrados: 0, separados: 0, soltos: 0, total: 0 }
  );

  const cards = [
    { label: "Retos",     valor: tot.retos,     color: "text-blue-600 dark:text-blue-400"    },
    { label: "Dobrados",  valor: tot.dobrados,  color: "text-amber-600 dark:text-amber-400"  },
    { label: "Separados", valor: tot.separados, color: "text-violet-600 dark:text-violet-400"},
    { label: "Soltos",    valor: tot.soltos,    color: "text-orange-600 dark:text-orange-400"},
    { label: "Total",     valor: tot.total,     color: "text-foreground font-bold"           },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:flex print:gap-6 print:border print:border-black print:p-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
          <p className="text-xs text-muted-foreground print:text-black">{c.label}</p>
          <p className={`mt-1 text-2xl tabular-nums print:text-xl print:text-black ${c.color}`}>
            {c.valor.toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RelatorioEstoqueFisico() {
  const navigate = useNavigate();
  const [dataSel, setDataSel] = useState<string>(hoje());
  const [invSel, setInvSel] = useState<number | null>(null);

  const { data: inventarios = [], isFetching: carregandoInvs } = useQuery({
    queryKey: ["estoque-fisico-inventarios", dataSel],
    queryFn: () => listarInventariosPorData(dataSel),
    enabled: !!dataSel,
    onSuccess: (lista: InventarioResumo[]) => {
      // seleciona automaticamente se houver só um
      if (lista.length === 1) setInvSel(lista[0].id);
      else setInvSel(null);
    },
  });

  const { data: linhas = [], isFetching: carregandoLinhas, isError } = useQuery({
    queryKey: ["estoque-fisico", invSel],
    queryFn: () => buscarEstoqueFisico(invSel!),
    enabled: invSel !== null,
    retry: false,
  });

  const invAtual = inventarios.find(i => i.id === invSel);
  const podeImprimir = !carregandoLinhas && !isError && linhas.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background print:bg-white">

      {/* Cabeçalho de tela */}
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
              <h1 className="text-xl font-bold text-foreground">Estoque Físico por Data</h1>
              <p className="text-sm text-muted-foreground">Resumo do inventário por bitola</p>
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

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold text-black">Estoque Físico por Data</h1>
        {invAtual && (
          <p className="text-sm text-black">
            Data: <strong>{invAtual.dataReferencia}</strong>
            &nbsp;·&nbsp; Inventário <strong>#{invAtual.id}</strong>
            &nbsp;·&nbsp; Status: {STATUS_LABEL[invAtual.status] ?? invAtual.status}
          </p>
        )}
        <hr className="mt-2 border-black" />
      </div>

      <main className="container flex-1 space-y-6 py-6 print:py-2 print:space-y-4">

        {/* Filtros */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm print:hidden space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Seleção de data */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Data do inventário</label>
              <input
                type="date"
                value={dataSel}
                onChange={e => {
                  setDataSel(e.target.value);
                  setInvSel(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Seleção de inventário */}
            {dataSel && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Inventário</label>
                {carregandoInvs ? (
                  <span className="text-xs text-muted-foreground">Carregando…</span>
                ) : inventarios.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhum inventário nesta data.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {inventarios.map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => setInvSel(inv.id)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          invSel === inv.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        #{inv.id} — {STATUS_LABEL[inv.status] ?? inv.status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Carregando */}
        {carregandoLinhas && (
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
        {invSel !== null && !carregandoLinhas && !isError && (
          <>
            <Totais linhas={linhas} />

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm print:overflow-visible print:rounded-none print:border-black print:shadow-none">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground print:bg-gray-200 print:text-black">
                    <th className="px-4 py-3 print:px-2 print:py-1">Bitola</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Retos</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Dobrados</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Separados</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Soltos</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-gray-300">
                  {linhas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum item registrado neste inventário.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {linhas.map((l, idx) => (
                        <tr key={idx} className="transition-colors hover:bg-muted/30 print:hover:bg-transparent">
                          <td className="px-4 py-2 font-medium print:px-2 print:py-1 print:text-black">{l.bitola}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-600 dark:text-blue-400 print:px-2 print:py-1 print:text-black">
                            {l.retos > 0 ? l.retos.toLocaleString("pt-BR") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400 print:px-2 print:py-1 print:text-black">
                            {l.dobrados > 0 ? l.dobrados.toLocaleString("pt-BR") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-violet-600 dark:text-violet-400 print:px-2 print:py-1 print:text-black">
                            {l.separados > 0 ? l.separados.toLocaleString("pt-BR") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-orange-600 dark:text-orange-400 print:px-2 print:py-1 print:text-black">
                            {l.soltos > 0 ? l.soltos.toLocaleString("pt-BR") : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold print:px-2 print:py-1 print:text-black">
                            {l.total.toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                      {/* Linha de totais */}
                      {linhas.length > 1 && (() => {
                        const t = linhas.reduce((acc, l) => ({
                          retos: acc.retos + l.retos,
                          dobrados: acc.dobrados + l.dobrados,
                          separados: acc.separados + l.separados,
                          soltos: acc.soltos + l.soltos,
                          total: acc.total + l.total,
                        }), { retos: 0, dobrados: 0, separados: 0, soltos: 0, total: 0 });
                        return (
                          <tr className="border-t-2 border-border bg-muted/20 font-semibold print:border-t-2 print:border-black print:bg-gray-100">
                            <td className="px-4 py-2 print:px-2 print:py-1 print:text-black">Total</td>
                            <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{t.retos.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{t.dobrados.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{t.separados.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{t.soltos.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{t.total.toLocaleString("pt-BR")}</td>
                          </tr>
                        );
                      })()}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-right text-xs text-muted-foreground print:hidden">
              {linhas.length} bitola{linhas.length !== 1 ? "s" : ""} · Inventário #{invSel}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
