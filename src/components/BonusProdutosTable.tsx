import { useMemo } from "react";
import type { BonusProdutoLinha } from "@/lib/bonusProduto";
import type { EtiquetaLidaComLinha } from "@/types/api";

interface BonusProdutosTableProps {
  produtos: BonusProdutoLinha[];
  etiquetas?: EtiquetaLidaComLinha[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onSolicitarEtiqueta?: (prod: BonusProdutoLinha) => void;
}

function formatPeso(valor: number): string {
  if (valor === 0) return "0";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BonusProdutosTable({
  produtos,
  etiquetas = [],
  loading,
  error,
  onRetry,
  onSolicitarEtiqueta,
}: BonusProdutosTableProps) {
  const pesoBipadoPorProduto = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of etiquetas) {
      const cod = e.codigoProduto.trim();
      if (!cod) continue;
      const peso = parseFloat(String(e.peso).replace(",", ".")) || 0;
      mapa.set(cod, (mapa.get(cod) ?? 0) + peso);
    }
    return mapa;
  }, [etiquetas]);

  const pesoBipadoTotal = useMemo(
    () => etiquetas.reduce((acc, e) => acc + (parseFloat(String(e.peso).replace(",", ".")) || 0), 0),
    [etiquetas],
  );
  if (loading) {
    return (
      <div className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-8 text-center text-lg text-muted-foreground">
        Carregando produtos do bônus…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">{error.message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="industrial-btn-primary mt-4">
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (produtos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-8 text-center text-muted-foreground">
        Nenhum produto cadastrado neste bônus.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
      <h2 className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_98%)] px-4 py-3 text-base font-bold text-[hsl(222_47%_11%)]">
        Produtos do bônus
      </h2>
      <table className="w-full min-w-[760px] text-left text-sm md:text-base">
        <thead>
          <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Descrição</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd NF</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd Entrada</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Peso Bipado</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)] text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => {
            const bipado = pesoBipadoPorProduto.get(p.codigo) ?? 0;
            const pesoRef = p.pesoTotal || 0;
            const completo = pesoRef > 0 && bipado >= pesoRef;
            return (
              <tr
                key={p.rowKey}
                className="border-b border-[hsl(214_32%_91%)] last:border-0 even:bg-[hsl(210_40%_98%)]"
              >
                <td className="px-4 py-3 font-mono text-xs md:text-sm">{p.codigo}</td>
                <td className="max-w-[220px] px-4 py-3">{p.descricao || "—"}</td>
                <td className="px-4 py-3 tabular-nums">{p.qtdNf}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-[#1e40af]">
                  {p.qtdEntradaInicial}
                </td>
                <td className={`px-4 py-3 tabular-nums font-semibold ${completo ? "text-emerald-600" : bipado > 0 ? "text-[#1e40af]" : "text-muted-foreground"}`}>
                  {formatPeso(bipado)}
                </td>
                <td className="px-4 py-3">{p.lote || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSolicitarEtiqueta?.(p);
                    }}
                    className="rounded bg-[#1e40af]/10 px-3 py-1 text-xs font-bold text-[#1e40af] transition-colors hover:bg-[#1e40af] hover:text-white"
                    title="Solicitar Nova Etiqueta"
                  >
                    Solicitar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
            <td colSpan={4} className="px-4 py-3 text-right font-bold text-[hsl(215_16%_35%)]">
              Total Bônus
            </td>
            <td className="px-4 py-3 tabular-nums font-bold text-[#1e40af]">{formatPeso(pesoBipadoTotal)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
