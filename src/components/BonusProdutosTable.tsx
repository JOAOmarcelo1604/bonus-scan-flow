import type { BonusProdutoLinha } from "@/lib/bonusProduto";

interface BonusProdutosTableProps {
  produtos: BonusProdutoLinha[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function BonusProdutosTable({
  produtos,
  loading,
  error,
  onRetry,
}: BonusProdutosTableProps) {
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
      <table className="w-full min-w-[880px] text-left text-sm md:text-base">
        <thead>
          <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Descrição</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd NF</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd Entrada</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Fornecedor</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
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
                <td className="px-4 py-3">{p.lote || "—"}</td>
                <td className="px-4 py-3">{p.fornecedor || "—"}</td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
