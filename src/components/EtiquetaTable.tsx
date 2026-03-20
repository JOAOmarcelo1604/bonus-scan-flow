import type { EtiquetaLidaComLinha } from "@/types/api";

interface EtiquetaTableProps {
  etiquetas: EtiquetaLidaComLinha[];
  flashingRowId: string | null;
}

export function EtiquetaTable({ etiquetas, flashingRowId }: EtiquetaTableProps) {
  if (etiquetas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-8 text-center text-lg text-muted-foreground">
        Nenhuma etiqueta bipada ainda. Escaneie um código de barras acima.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm md:text-base">
        <thead>
          <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código de Barras</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Produto</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Série</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Peso</th>
            <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Fornecedor</th>
          </tr>
        </thead>
        <tbody>
          {etiquetas.map((e) => {
            const flash = flashingRowId === e._rowId;
            return (
              <tr
                key={e._rowId}
                className={`border-b border-[hsl(214_32%_91%)] last:border-0 ${
                  flash
                    ? "bg-emerald-100/95 transition-colors duration-300"
                    : "even:bg-[hsl(210_40%_98%)]"
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs md:text-sm">{e.codigoBarras}</td>
                <td className="px-4 py-3 font-medium">{e.codigoProduto}</td>
                <td className="px-4 py-3">{e.lote}</td>
                <td className="px-4 py-3">{e.serie}</td>
                <td className="px-4 py-3 tabular-nums">{e.peso}</td>
                <td className="px-4 py-3">{e.fornecedor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
