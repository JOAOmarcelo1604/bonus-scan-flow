import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from "recharts";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { buscarInventarioBiExpedicao } from "@/services/api";
import type { BitolaDeltaItem, ExpedicaoPeriodoItem } from "@/types/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MESES_PT = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function fmtKg(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

/** Variação (Δ): sinal sempre visível, ex. −10.505,00 (saída) ou +262.140,00 (entrada). */
function fmtKgDeltaComSinal(n: number) {
  const abs = Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  if (n < 0) return `-${abs}`;
  if (n > 0) return `+${abs}`;
  return abs;
}

function fmtKgDeltaTextoKg(n: number) {
  return `${fmtKgDeltaComSinal(n)} kg`;
}

function parseDataRef(s: string): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** yyyy-mm-dd no fuso local (evita deslocamento em parse ISO UTC). */
function parseDataIsoLocal(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Pesos exibidos na tabela → Δ = atual − anterior (consistente mesmo se o campo pesoExpedicaoKgHeader da API estiver invertido em versões antigas). */
function deltaCabecalho(p: ExpedicaoPeriodoItem): number {
  return p.pesoTotalAtualKg - p.pesoTotalAnteriorKg;
}

function deltaBitola(d: BitolaDeltaItem): number {
  return d.pesoKgAtual - d.pesoKgAnterior;
}

function maiorAbsDeltaBitola(list: BitolaDeltaItem[]): BitolaDeltaItem[] {
  return [...list].sort(
    (a, b) => Math.abs(deltaBitola(b)) - Math.abs(deltaBitola(a)),
  );
}

function corDeltaKg(varKg: number) {
  if (varKg < 0) return "text-red-600 dark:text-red-400";
  if (varKg > 0) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
}

const chartConfig = {
  expedicao: {
    label: "Δ kg (atual − ant.)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function ExpedicaoInventarioBi() {
  const navigate = useNavigate();
  const [abaDetalhe, setAbaDetalhe] = useState<string>("graficos");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["inventario-bi-expedicao"],
    queryFn: buscarInventarioBiExpedicao,
  });

  const periodosRecentes = useMemo(() => {
    const p = data?.periodos ?? [];
    return [...p].reverse();
  }, [data?.periodos]);

  const serieDiaria = useMemo(() => {
    return (data?.periodos ?? []).map((p) => ({
      label: parseDataRef(p.dataReferenciaAtual),
      dataIso: p.dataReferenciaAtual,
      expedicao: deltaCabecalho(p),
    }));
  }, [data?.periodos]);

  /** Totais alinhados ao Δ recalculado (atual − ant.), não aos agregados do backend. */
  const serieSemanal = useMemo(() => {
    const periodos = data?.periodos ?? [];
    const map = new Map<string, number>();
    for (const p of periodos) {
      const delta = deltaCabecalho(p);
      const dt = parseDataIsoLocal(p.dataReferenciaAtual);
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const y = getISOWeekYear(dt);
      const w = getISOWeek(dt);
      const label = `${y}-W${String(w).padStart(2, "0")}`;
      map.set(label, (map.get(label) ?? 0) + delta);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, expedicao]) => ({ label, expedicao }));
  }, [data?.periodos]);

  const serieMensal = useMemo(() => {
    const periodos = data?.periodos ?? [];
    const map = new Map<string, { expedicao: number; ano: number; mes: number }>();
    for (const p of periodos) {
      const delta = deltaCabecalho(p);
      const dt = parseDataIsoLocal(p.dataReferenciaAtual);
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const ano = dt.getFullYear();
      const mes = dt.getMonth() + 1;
      const key = `${ano}-${String(mes).padStart(2, "0")}`;
      const prev = map.get(key);
      map.set(key, {
        expedicao: (prev?.expedicao ?? 0) + delta,
        ano,
        mes,
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: `${MESES_PT[v.mes] ?? v.mes}/${v.ano}`,
        expedicao: v.expedicao,
      }));
  }, [data?.periodos]);

  const ultimoPeriodo: ExpedicaoPeriodoItem | undefined = periodosRecentes[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">BI — Expedição por inventário</h1>
              <p className="text-sm text-muted-foreground">
                Diferença de peso total: contagem da data de referência mais recente menos a anterior (peso atual − peso
                anterior) e repartição por bitola.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Atualizando…" : "Atualizar"}
          </Button>
        </div>
      </header>

      <main className="container space-y-8 py-8">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando indicadores…</p>}
        {isError && (
          <p className="text-sm text-destructive">Não foi possível carregar os dados. Tente novamente.</p>
        )}

        {data?.mensagemObservacao && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            {data.mensagemObservacao}
          </div>
        )}

        {!isLoading && !isError && ultimoPeriodo && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Último intervalo (data ref. mais recente)</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{parseDataRef(ultimoPeriodo.dataReferenciaAtual)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sessões #{ultimoPeriodo.inventarioAnteriorId} → #{ultimoPeriodo.inventarioAtualId}
                </p>
                <p
                  className={cn(
                    "mt-2 text-3xl font-bold tabular-nums",
                    corDeltaKg(deltaCabecalho(ultimoPeriodo)),
                  )}
                >
                  {fmtKgDeltaTextoKg(deltaCabecalho(ultimoPeriodo))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-red-600 dark:text-red-400">− (vermelho)</span>: saída de estoque ·{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">+ (verde)</span>: entrada / aumento contado.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pesos de referência (cabeçalho)</CardDescription>
                <CardTitle className="text-base font-normal leading-relaxed">
                  Anterior: {fmtKg(ultimoPeriodo.pesoTotalAnteriorKg)} kg
                  <br />
                  Atual: {fmtKg(ultimoPeriodo.pesoTotalAtualKg)} kg
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Bitolas com maior |Δ| no último intervalo</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1">
                  {maiorAbsDeltaBitola(
                    (ultimoPeriodo.deltasPorBitola ?? []).filter((d) => Math.abs(deltaBitola(d)) > 0.0005),
                  )
                    .slice(0, 5)
                    .map((d) => (
                    <li key={d.bitola} className="flex justify-between gap-2 tabular-nums">
                      <span className="text-muted-foreground">
                        {d.bitola.startsWith("(") ? d.bitola : `${d.bitola} mm`}
                      </span>
                      <span className={corDeltaKg(deltaBitola(d))}>{fmtKgDeltaTextoKg(deltaBitola(d))}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={abaDetalhe} onValueChange={setAbaDetalhe}>
          <TabsList>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="tabela">Períodos e bitolas</TabsTrigger>
          </TabsList>
          <TabsContent value="graficos" className="mt-6 space-y-8">
            {serieDiaria.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Variação por intervalo (data da contagem atual)</CardTitle>
                  <CardDescription>
                    Cada barra = peso total da contagem atual menos o da contagem anterior na linha do tempo (atual −
                    anterior).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[340px] w-full">
                    <BarChart accessibilityLayer data={serieDiaria} margin={{ left: 8, right: 8, top: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} tickMargin={8} />
                      <YAxis tickFormatter={(v) => fmtKg(Number(v))} width={72} />
                      <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(l) => `Ref. ${l}`} />}
                        formatter={(value) => [fmtKgDeltaTextoKg(Number(value)), "Δ (atual − ant.)"]}
                      />
                      <Bar dataKey="expedicao" fill="var(--color-expedicao)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {(serieSemanal.length > 0 || serieMensal.length > 0) && (
              <div className="grid gap-8 lg:grid-cols-2">
                {serieSemanal.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Total por semana (ISO)</CardTitle>
                      <CardDescription>Soma dos intervalos cuja data de referência atual cai na semana.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[280px] w-full">
                        <BarChart accessibilityLayer data={serieSemanal} margin={{ left: 8, right: 8, top: 8 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="label" tickLine={false} tickMargin={8} angle={-25} height={54} interval={0} />
                          <YAxis tickFormatter={(v) => fmtKg(Number(v))} width={72} />
                          <ChartTooltip
                            formatter={(value) => [fmtKgDeltaTextoKg(Number(value)), "Σ semana"]}
                          />
                          <Bar dataKey="expedicao" fill="hsl(var(--chart-2))" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}
                {serieMensal.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Total por mês</CardTitle>
                      <CardDescription>Soma dos intervalos por mês da data de referência atual.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[280px] w-full">
                        <BarChart accessibilityLayer data={serieMensal} margin={{ left: 8, right: 8, top: 8 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="label" tickLine={false} tickMargin={8} />
                          <YAxis tickFormatter={(v) => fmtKg(Number(v))} width={72} />
                          <ChartTooltip formatter={(value) => [fmtKgDeltaTextoKg(Number(value)), "Σ mês"]} />
                          <Bar dataKey="expedicao" fill="hsl(var(--chart-3))" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {!isLoading && !isError && serieDiaria.length === 0 && !data?.mensagemObservacao && (
              <p className="text-sm text-muted-foreground">Sem séries para exibir.</p>
            )}
          </TabsContent>
          <TabsContent value="tabela" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de intervalos</CardTitle>
                <CardDescription>
                  Δ por bitola = soma de pesos na contagem atual menos soma na anterior (mesma lógica do cabeçalho; itens
                  com produto no Winthor).
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Ref. atual</TableHead>
                      <TableHead className="whitespace-nowrap">Sessões</TableHead>
                      <TableHead className="text-right">Peso ant. (kg)</TableHead>
                      <TableHead className="text-right">Peso atual (kg)</TableHead>
                      <TableHead className="text-right">Δ cabeçalho (atual − ant.)</TableHead>
                      <TableHead>Principais bitolas (Δ)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodosRecentes.map((row) => (
                      <TableRow key={`${row.inventarioAnteriorId}-${row.inventarioAtualId}`}>
                        <TableCell className="whitespace-nowrap font-medium">{parseDataRef(row.dataReferenciaAtual)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                          #{row.inventarioAnteriorId} → #{row.inventarioAtualId}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtKg(row.pesoTotalAnteriorKg)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtKg(row.pesoTotalAtualKg)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-medium",
                            corDeltaKg(deltaCabecalho(row)),
                          )}
                        >
                          {fmtKgDeltaComSinal(deltaCabecalho(row))}
                        </TableCell>
                        <TableCell className="max-w-[360px] text-xs leading-relaxed">
                          {maiorAbsDeltaBitola((row.deltasPorBitola ?? []).filter((d) => Math.abs(deltaBitola(d)) > 0.0005))
                              .length === 0
                            ? "—"
                            : maiorAbsDeltaBitola((row.deltasPorBitola ?? []).filter((d) => Math.abs(deltaBitola(d)) > 0.0005))
                                .slice(0, 6)
                                .map((d, i, arr) => (
                                  <span key={`${row.inventarioAtualId}-${d.bitola}-${i}`}>
                                    <span className="text-muted-foreground">
                                      {d.bitola.includes("(") ? d.bitola : `${d.bitola}mm`}
                                    </span>
                                    {": "}
                                    <span className={cn("tabular-nums font-medium", corDeltaKg(deltaBitola(d)))}>
                                      {fmtKgDeltaComSinal(deltaBitola(d))}
                                    </span>
                                    {i < arr.length - 1 ? <span className="text-muted-foreground"> · </span> : null}
                                  </span>
                                ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
