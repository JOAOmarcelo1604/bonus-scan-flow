import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  buscarRelatorioAuditoriaEstoque,
  listarBitolasSeparacao,
} from "@/services/api";
import type { RelatorioAuditoriaEstoqueLinha } from "@/types/api";

const MESES = [
  { v: 1,  n: "Janeiro"   },
  { v: 2,  n: "Fevereiro" },
  { v: 3,  n: "Março"     },
  { v: 4,  n: "Abril"     },
  { v: 5,  n: "Maio"      },
  { v: 6,  n: "Junho"     },
  { v: 7,  n: "Julho"     },
  { v: 8,  n: "Agosto"    },
  { v: 9,  n: "Setembro"  },
  { v: 10, n: "Outubro"   },
  { v: 11, n: "Novembro"  },
  { v: 12, n: "Dezembro"  },
];

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function Resumo({ linhas }: { linhas: RelatorioAuditoriaEstoqueLinha[] }) {
  const totFisico = linhas.reduce((s, l) => s + l.totalFisico, 0);
  const totSistema = linhas.reduce((s, l) => s + l.totalSistema, 0);
  const totSaida = linhas.reduce((s, l) => s + l.saidaFilial5, 0);
  const totResultado = linhas.reduce((s, l) => s + l.resultado, 0);

  const cards = [
    { label: "Σ Físico",        valor: totFisico   },
    { label: "Σ Sistema (D-1)", valor: totSistema  },
    { label: "Σ Saída Filial 5",valor: totSaida    },
    { label: "Σ Resultado",     valor: totResultado, destaque: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:flex print:gap-6 print:border print:border-black print:p-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0">
          <p className="text-xs text-muted-foreground print:text-black">{c.label}</p>
          <p className={`mt-1 text-2xl font-bold print:text-xl print:text-black ${
            c.destaque
              ? c.valor === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : c.valor > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              : "text-foreground"
          }`}>
            {fmt(c.valor)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function RelatorioAuditoriaEstoque() {
  const navigate = useNavigate();
  const hoje = new Date();

  const [bitola, setBitola] = useState<string | null>(null);
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [filtro, setFiltro] = useState<{ bitola: string; ano: number; mes: number } | null>(null);

  const { data: bitolas = [], isLoading: carregandoBitolas } = useQuery({
    queryKey: ["bitolas-separacao"],
    queryFn: listarBitolasSeparacao,
    staleTime: 5 * 60 * 1000,
  });

  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["relatorio-auditoria-estoque", filtro],
    queryFn: () => buscarRelatorioAuditoriaEstoque(filtro!.bitola, filtro!.ano, filtro!.mes),
    enabled: filtro !== null,
    retry: false,
    onError: () => toast.error("Erro ao carregar relatório."),
  });

  const podeImprimir = !isFetching && !isError && data.length > 0;

  function handleGerar() {
    if (!bitola) {
      toast.error("Selecione uma bitola.");
      return;
    }
    setFiltro({ bitola, ano, mes });
  }

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - i);
  const tituloMes = filtro ? MESES.find(m => m.v === filtro.mes)?.n : "";

  return (
    <div className="flex min-h-screen flex-col bg-background print:bg-white">
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
              <h1 className="text-xl font-bold text-foreground">Auditoria de Estoque</h1>
              <p className="text-sm text-muted-foreground">Comparativo diário Físico × Winthor por bitola</p>
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
        <h1 className="text-xl font-bold text-black">Relatório de Auditoria de Estoque</h1>
        {filtro && (
          <p className="text-sm text-black">
            Bitola: <strong>{filtro.bitola} mm</strong> &nbsp;·&nbsp; Período: <strong>{tituloMes}/{filtro.ano}</strong>
          </p>
        )}
        <hr className="mt-2 border-black" />
      </div>

      <main className="container flex-1 space-y-6 py-6 print:py-2 print:space-y-4">
        {/* Filtros */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm print:hidden">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Bitola</label>
              {carregandoBitolas ? (
                <span className="text-xs text-muted-foreground">Carregando…</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bitolas.map(b => (
                    <button
                      key={b}
                      onClick={() => setBitola(b)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        bitola === b
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

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Mês</label>
              <select
                value={mes}
                onChange={e => setMes(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {MESES.map(m => (
                  <option key={m.v} value={m.v}>{m.n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Ano</label>
              <select
                value={ano}
                onChange={e => setAno(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {anosDisponiveis.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGerar}
                disabled={!bitola}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                Gerar
              </button>
            </div>
          </div>
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

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400 print:hidden">
            Erro ao carregar os dados. Tente novamente.
          </div>
        )}

        {filtro && !isFetching && !isError && (
          <>
            <Resumo linhas={data} />

            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm print:overflow-visible print:rounded-none print:border-black print:shadow-none">
              <table className="w-full text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground print:bg-gray-200 print:text-black">
                    <th className="px-4 py-3 print:px-2 print:py-1">Data</th>
                    <th className="px-4 py-3 print:px-2 print:py-1">Bitola</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Total Físico</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Total Sistema (D-1)</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Saída Filial 5</th>
                    <th className="px-4 py-3 print:px-2 print:py-1 text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-gray-300">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum inventário aprovado encontrado neste período.
                      </td>
                    </tr>
                  ) : (
                    data.map((linha, idx) => (
                      <tr
                        key={`${linha.data}-${idx}`}
                        className={`transition-colors hover:bg-muted/30 print:hover:bg-transparent ${
                          linha.resultado !== 0
                            ? "bg-amber-50/60 dark:bg-amber-950/10 print:bg-amber-50"
                            : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs print:px-2 print:py-1 print:text-black">
                          {linha.data}
                        </td>
                        <td className="px-4 py-2 print:px-2 print:py-1 print:text-black">{linha.bitola}</td>
                        <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{fmt(linha.totalFisico)}</td>
                        <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{fmt(linha.totalSistema)}</td>
                        <td className="px-4 py-2 text-right tabular-nums print:px-2 print:py-1 print:text-black">{fmt(linha.saidaFilial5)}</td>
                        <td className={`px-4 py-2 text-right tabular-nums font-semibold print:px-2 print:py-1 print:text-black ${
                          linha.resultado === 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : linha.resultado > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}>
                          {fmt(linha.resultado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-right text-xs text-muted-foreground print:hidden">
              {data.length} dia(s) · {filtro.bitola} mm · {tituloMes}/{filtro.ano}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
