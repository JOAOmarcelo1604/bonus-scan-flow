import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { CartesianGrid, Bar, BarChart, XAxis, YAxis } from "recharts";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { buscarInventarioBiExpedicao, buscarInventarioBiSaidaDetalhes } from "@/services/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function rotuloDestinoBreve(codigo: string): string {
  const m: Record<string, string> = {
    SEP_PEDIDO: "Pedido (SEP-)",
    ABERTURA: "Abertura",
    SOLTO_MANUAL: "Solto",
    REGISTRO_SINTETICO: "Sintético (MAN-)",
    SEM_VINCULO_EXPLICITO: "Sem vínculo claro",
  };
  return m[codigo] ?? codigo;
}

function mensagemErroConsulta(e: unknown): string {
  if (typeof e === "object" && e !== null && "response" in e) {
    const raw = (e as { response?: { data?: unknown } }).response?.data;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  if (e instanceof Error && e.message) return e.message;
  return "Não foi possível carregar o detalhe.";
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
  const [intervaloSaidaEtiquetas, setIntervaloSaidaEtiquetas] = useState<{
    ant: number;
    cur: number;
  } | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["inventario-bi-expedicao"],
    queryFn: buscarInventarioBiExpedicao,
  });

  const querySaidaEtiquetas = useQuery({
    queryKey: ["inventario-bi-saida-etiquetas", intervaloSaidaEtiquetas?.ant, intervaloSaidaEtiquetas?.cur],
    queryFn: () =>
      buscarInventarioBiSaidaDetalhes(intervaloSaidaEtiquetas!.ant, intervaloSaidaEtiquetas!.cur),
    enabled: intervaloSaidaEtiquetas !== null,
  });

  const resumoDestinoKg = useMemo(() => {
    const lines = querySaidaEtiquetas.data?.apenasNaContagemAnterior ?? [];
    const m = new Map<string, { qt: number; kg: number }>();
    for (const l of lines) {
      const prev = m.get(l.codigoDestino) ?? { qt: 0, kg: 0 };
      prev.qt += 1;
      prev.kg += Number(l.pesoKg ?? 0);
      m.set(l.codigoDestino, prev);
    }
    return [...m.entries()].sort((a, b) => Math.abs(b[1].kg) - Math.abs(a[1].kg));
  }, [querySaidaEtiquetas.data]);

  /** Δ oficial do BI (#ant → #cur) quando o modal está aberto. */
  const deltaOficialIntervaloModal = useMemo(() => {
    if (!intervaloSaidaEtiquetas || !data?.periodos) return null;
    const row = data.periodos.find(
      (p) =>
        p.inventarioAnteriorId === intervaloSaidaEtiquetas.ant &&
        p.inventarioAtualId === intervaloSaidaEtiquetas.cur,
    );
    return row !== undefined ? deltaCabecalho(row) : null;
  }, [intervaloSaidaEtiquetas, data?.periodos]);

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
          <div className="rounded-lg border border-blue-700/30 bg-blue-50/95 px-4 py-3 text-sm text-blue-950 dark:border-blue-600/35 dark:bg-blue-950/60 dark:text-blue-50">
            {data.mensagemObservacao}
          </div>
        )}

        {!isLoading && !isError && ultimoPeriodo && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <Card className="border-blue-700/35 bg-blue-50/95 dark:bg-card dark:border-blue-700/35">
              <CardHeader className="pb-2">
                <CardDescription>Separado e solto (último intervalo)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-foreground">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-md border border-border/80 bg-background/80 px-3 py-2">
                    <dt className="text-xs font-medium text-muted-foreground">Separado (SEP‑)</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">
                      {data?.pesoUltimoDetalheSeparadoKg != null ? `${fmtKg(data.pesoUltimoDetalheSeparadoKg)} kg` : "—"}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border/80 bg-background/80 px-3 py-2">
                    <dt className="text-xs font-medium text-muted-foreground">Solto (MAN‑ / sintético)</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">
                      {data?.pesoUltimoDetalheSoltoSinteticoKg != null ? `${fmtKg(data.pesoUltimoDetalheSoltoSinteticoKg)} kg` : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="rounded-md border border-blue-800/30 bg-background px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Total (SEP + MAN‑)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-950 dark:text-foreground">
                    {data?.pesoUltimoDetalheSeparadoMaisSoltoKg != null
                      ? `${fmtKg(data.pesoUltimoDetalheSeparadoMaisSoltoKg)} kg`
                      : "—"}
                  </p>
                </div>
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
                      <TableHead className="text-center whitespace-nowrap">Etiquetas</TableHead>
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
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                              setIntervaloSaidaEtiquetas({
                                ant: row.inventarioAnteriorId,
                                cur: row.inventarioAtualId,
                              })
                            }
                          >
                            Ver onde foram
                          </Button>
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

      <Dialog
        open={intervaloSaidaEtiquetas !== null}
        onOpenChange={(open) => {
          if (!open) setIntervaloSaidaEtiquetas(null);
        }}
      >
        <DialogContent className="flex h-[min(95vh,min(1200px,95dvh))] w-full max-w-[min(96vw,92rem)] flex-col gap-4 overflow-hidden p-6 sm:p-8">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Etiquetas só na contagem anterior
              {intervaloSaidaEtiquetas ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  #{intervaloSaidaEtiquetas.ant} → #{intervaloSaidaEtiquetas.cur}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription className="text-left">
              Códigos bipados na primeira sessão e ausentes na segunda (mesmo código). Não explica todo o Δ do cabeçalho quando
              há mudança de peso mantendo etiqueta ou itens novos só na segunda contagem — veja observação ao final quando
              houver.
            </DialogDescription>
          </DialogHeader>

          {intervaloSaidaEtiquetas && querySaidaEtiquetas.isPending && (
            <p className="text-sm text-muted-foreground">Carregando detalhes…</p>
          )}
          {querySaidaEtiquetas.isError && (
            <p className="text-sm text-destructive">{mensagemErroConsulta(querySaidaEtiquetas.error)}</p>
          )}

          {querySaidaEtiquetas.data && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="rounded-md border border-blue-700/30 bg-blue-50/95 px-3 py-3 text-[13px] leading-relaxed text-blue-950 dark:border-blue-500/40 dark:bg-blue-950/90 dark:text-white">
                <p className="font-semibold text-blue-950 dark:text-white">Δ do BI × soma deste modal</p>
                {deltaOficialIntervaloModal != null ? (
                  <p className="mt-1 text-blue-900 dark:text-neutral-50">
                    O número <strong>oficial na página</strong> é o Δ do cabeçalho entre as sessões:{" "}
                    <strong className={cn("tabular-nums", corDeltaKg(deltaOficialIntervaloModal))}>
                      {fmtKgDeltaTextoKg(deltaOficialIntervaloModal)}
                    </strong>{" "}
                    (peso total aprovado da contagem atual − peso total da anterior — todos os itens).
                  </p>
                ) : (
                  <p className="mt-1 text-blue-900 dark:text-neutral-50">
                    O Δ do topo compara os <strong>pesos totais aprovados</strong> das duas sessões inteiras.
                  </p>
                )}
                <p className="mt-2 text-blue-900 dark:text-neutral-50">
                  O <strong className="tabular-nums">Σ das linhas abaixo</strong> só soma pesos em que{" "}
                  <strong>a mesma etiqueta existiu na 1ª contagem e não aparece na 2ª</strong>. Esse montante pode ser
                  <strong> maior ou menor </strong>
                  que o Δ do BI: há entradas só na segunda contagem, etiquetas repetidas com peso diferente,
                  registros só na segunda, etc.; os chips por destino apenas classificam essas mesmas linhas que “sumiram”
                  da 2ª leitura.
                </p>
              </div>

              <div className="grid shrink-0 gap-2 text-sm">
                <p className="tabular-nums text-muted-foreground">
                  Σ pesos destas linhas (saídas por etiqueta ausente na 2ª):{" "}
                  <span className="font-medium text-foreground">
                    {fmtKg(querySaidaEtiquetas.data.somaPesoLinhasKg)} kg
                  </span>
                </p>
                {resumoDestinoKg.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {resumoDestinoKg.map(([codigo, v]) => (
                      <span
                        key={codigo}
                        className="rounded-md border bg-muted/40 px-2 py-1 text-xs tabular-nums"
                      >
                        {rotuloDestinoBreve(codigo)}: {fmtKg(v.kg)} kg ({v.qt} ite{v.qt === 1 ? "m" : "ns"})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="-mx-1 min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain rounded-lg border border-border/70 pr-1 [scrollbar-gutter:stable]"
                role="region"
                aria-label="Lista de etiquetas ausentes na segunda contagem"
              >
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableRow>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Qtd.</TableHead>
                      <TableHead className="text-right">Peso (kg)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Destino / vínculo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {querySaidaEtiquetas.data.apenasNaContagemAnterior.map((ln, idx) => (
                      <TableRow key={`${ln.etiqueta}-${idx}`}>
                        <TableCell className="max-w-[200px] break-all font-mono text-xs">{ln.etiqueta}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {ln.quantidade != null ? ln.quantidade : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums">{fmtKg(Number(ln.pesoKg ?? 0))}</span>
                          {ln.pesoEstimadoPorPcprodut ? (
                            <span className="mt-1 block max-w-[14rem] text-left text-[10px] leading-tight text-blue-900 dark:text-blue-100">
                              Estimativa: qtde × PCPRODUT.PESOLIQ
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ln.statusEtiqueta ?? "—"}</TableCell>
                        <TableCell className="min-w-[200px] max-w-[320px] text-xs leading-relaxed">
                          <span className="text-muted-foreground">{rotuloDestinoBreve(ln.codigoDestino)}:</span>{" "}
                          {ln.textoDestino}
                          {ln.numPed != null ? (
                            <span className="block text-muted-foreground">Pedido: {ln.numPed}</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {querySaidaEtiquetas.data.apenasNaContagemAnterior.length === 0 && (
                <p className="shrink-0 text-sm text-muted-foreground">
                  Nenhuma etiqueta cadastrada só na primeira contagem (comparando por código igual). O Δ pode vir de
                  variação de peso ou de itens só na segunda contagem.
                </p>
              )}

              {querySaidaEtiquetas.data.textoObservacao && (
                <p className="shrink-0 rounded-md border border-blue-700/30 bg-blue-50/95 px-3 py-3 text-xs leading-relaxed text-blue-950 dark:border-blue-500/40 dark:bg-blue-950/90 dark:text-white">
                  {querySaidaEtiquetas.data.textoObservacao}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
