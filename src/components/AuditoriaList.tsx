import { useEffect, useState } from "react";
import { listarAuditorias } from "@/services/api";
import type { AuditoriaModel } from "@/types/api";
import { StatusBadge } from "@/components/StatusBadge";

export function AuditoriaList() {
  const [data, setData] = useState<AuditoriaModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarAuditorias()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        Nenhuma auditoria encontrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            <th className="px-4 py-3 font-semibold text-muted-foreground">ID</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Bônus</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">NF</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
            <th className="px-4 py-3 font-semibold text-muted-foreground">Observação</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id} className="zebra-row border-b border-border last:border-0">
              <td className="px-4 py-3 tabular-nums">{a.id}</td>
              <td className="px-4 py-3 font-medium">{a.numBonus}</td>
              <td className="px-4 py-3">{a.nf || "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3 text-muted-foreground">{a.observacao || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
