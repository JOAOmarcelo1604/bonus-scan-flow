import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { buscarEtiquetaPorCodigoBarras, listarEtiquetasByBonus } from "@/services/api";
import type { EtiquetaLida } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { BotaoReimprimir } from "@/components/BotaoReimprimir";

type Modo = "bonus" | "barras";

interface FiltroState {
  modo: Modo;
  valor: string;
}

function TabelaEtiquetas({
  etiquetas,
  usuario,
  onReimpressao,
}: {
  etiquetas: EtiquetaLida[];
  usuario: string;
  onReimpressao: () => void;
}) {
  if (etiquetas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhuma etiqueta encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
            <th className="px-4 py-3">Código de barras</th>
            <th className="px-4 py-3">Cód. produto</th>
            <th className="px-4 py-3">Fornecedor</th>
            <th className="px-4 py-3">Lote / Série</th>
            <th className="px-4 py-3 text-right">Peso (kg)</th>
            <th className="px-4 py-3 text-center">Vias</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {etiquetas.map((etiqueta, idx) => (
            <tr key={`${etiqueta.codigoBarras}-${idx}`} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-xs">{etiqueta.codigoBarras}</td>
              <td className="px-4 py-2 font-mono text-xs">{etiqueta.codigoProduto}</td>
              <td className="px-4 py-2 text-muted-foreground">{etiqueta.fornecedor || "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {etiqueta.lote || "—"}{etiqueta.serie ? ` / ${etiqueta.serie}` : ""}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {etiqueta.peso
                  ? parseFloat(etiqueta.peso).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "—"}
              </td>
              <td className="px-4 py-2 text-center tabular-nums text-muted-foreground">
                {etiqueta.vias ?? 1}
              </td>
              <td className="px-4 py-2">
                <BotaoReimprimir
                  codigoBarras={etiqueta.codigoBarras}
                  vias={etiqueta.vias ?? 1}
                  usuario={usuario}
                  onSuccess={onReimpressao}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-right text-xs text-muted-foreground">
        {etiquetas.length} etiqueta{etiquetas.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default function ReimpressaoEtiqueta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const usuario = user?.userCode ?? "";

  const [modo, setModo] = useState<Modo>("bonus");
  const [inputValue, setInputValue] = useState("");
  const [filtro, setFiltro] = useState<FiltroState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: etiquetasBonus = [],
    isFetching: fetchingBonus,
    isError: erroBonus,
    refetch: refetchBonus,
  } = useQuery({
    queryKey: ["reimpressao-bonus", filtro?.valor],
    queryFn: () => listarEtiquetasByBonus(Number(filtro!.valor)),
    enabled: filtro?.modo === "bonus",
    retry: false,
  });

  const {
    data: etiquetaBarras,
    isFetching: fetchingBarras,
    isError: erroBarras,
    refetch: refetchBarras,
  } = useQuery({
    queryKey: ["reimpressao-barras", filtro?.valor],
    queryFn: () => buscarEtiquetaPorCodigoBarras(filtro!.valor),
    enabled: filtro?.modo === "barras",
    retry: false,
  });

  const isFetching = fetchingBonus || fetchingBarras;
  const isError = erroBonus || erroBarras;

  const etiquetas: EtiquetaLida[] =
    filtro?.modo === "bonus"
      ? etiquetasBonus
      : etiquetaBarras
      ? [etiquetaBarras]
      : [];

  function handleBuscar() {
    const valor = inputValue.trim();
    if (!valor) return;
    setFiltro({ modo, valor });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleBuscar();
  }

  function handleModoChange(novoModo: Modo) {
    setModo(novoModo);
    setInputValue("");
    setFiltro(null);
    inputRef.current?.focus();
  }

  function handleReimpressao() {
    if (filtro?.modo === "bonus") refetchBonus();
    else refetchBarras();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container flex items-center gap-4 py-5">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Reimpressão de Etiquetas</h1>
            <p className="text-sm text-muted-foreground">Busque por número do bônus ou código de barras</p>
          </div>
        </div>
      </header>

      <main className="container flex-1 space-y-6 py-6">

        {/* Filtro */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">

          {/* Seletor de modo */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => handleModoChange("bonus")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                modo === "bonus"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              Por número do bônus
            </button>
            <button
              onClick={() => handleModoChange("barras")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                modo === "barras"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              Por código de barras
            </button>
          </div>

          {/* Input + botão */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type={modo === "bonus" ? "number" : "text"}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modo === "bonus" ? "Ex.: 123456" : "Ex.: 10015743130L000241EN..."}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleBuscar}
              disabled={!inputValue.trim() || isFetching}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetching ? (
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              )}
              Buscar
            </button>
          </div>
        </div>

        {/* Erro */}
        {isError && !isFetching && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            {filtro?.modo === "barras" && erroBarras
              ? "Etiqueta não encontrada para este código de barras."
              : "Erro ao buscar etiquetas. Verifique o número do bônus e tente novamente."}
          </div>
        )}

        {/* Resultado nulo (barras) */}
        {!isFetching && !isError && filtro?.modo === "barras" && filtro.valor && etiquetaBarras === null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
            Nenhuma etiqueta encontrada para o código de barras <span className="font-mono font-medium">{filtro.valor}</span>.
          </div>
        )}

        {/* Tabela */}
        {filtro && !isFetching && !isError && etiquetas.length > 0 && (
          <TabelaEtiquetas
            etiquetas={etiquetas}
            usuario={usuario}
            onReimpressao={handleReimpressao}
          />
        )}

      </main>
    </div>
  );
}
