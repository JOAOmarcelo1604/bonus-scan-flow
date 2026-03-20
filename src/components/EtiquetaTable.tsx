import type { EtiquetaLida } from "@/types/api";

interface EtiquetaTableProps {
  etiquetas: EtiquetaLida[];
}

export function EtiquetaTable({ etiquetas }: EtiquetaTableProps) {
  if (etiquetas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        Nenhuma etiqueta bipada ainda. Escaneie um código de barras acima.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            <th className="px-4 py-3 font-semibold text-muted-foreground">#</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Código de Barras</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Produto</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Lote</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Série</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Peso</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Fornecedor</th>
          </tr>
        </thead>
        <tbody>
          {etiquetas.map((e, i) => (
            <tr
              key={`${e.codigoBarras}-${i}`}
              className={`zebra-row border-b border-border last:border-0 ${i === 0 ? "fade-in-row" : ""}`}
            >
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{etiquetas.length - i}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.codigoBarras}</td>
              <td className="px-4 py-3 font-medium">{e.codigoProduto}</td>
              <td className="px-4 py-3">{e.lote}</td>
              <td className="px-4 py-3">{e.serie}</td>
              <td className="px-4 py-3 tabular-nums">{e.peso}</td>
              <td className="px-4 py-3">{e.fornecedor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
