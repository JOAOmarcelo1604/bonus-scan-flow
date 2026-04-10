import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import {
  aprovarAuditoria,
  listarAuditoriasPendentes,
  rejeitarAuditoria,
} from "@/services/api";
import type { AuditoriaModel } from "@/types/api";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PENDENTES_KEY = ["auditoria-pendentes"] as const;

export default function AprovacaoBonus() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejeitarId, setRejeitarId] = useState<number | null>(null);
  const [obsRejeicao, setObsRejeicao] = useState("");

  const { data: pendentes = [], isLoading, isError, refetch } = useQuery({
    queryKey: PENDENTES_KEY,
    queryFn: listarAuditoriasPendentes,
  });

  const removerCard = (id: number) => {
    queryClient.setQueryData<AuditoriaModel[]>(PENDENTES_KEY, (old) =>
      (old ?? []).filter((a) => a.id !== id),
    );
  };

  const aprovarMut = useMutation({
    mutationFn: aprovarAuditoria,
    onSuccess: (_, id) => {
      removerCard(id);
      toast.success("Auditoria aprovada.");
      queryClient.invalidateQueries({ queryKey: ["bonus-disponiveis"] });
      queryClient.invalidateQueries({ queryKey: ["bonus-disponiveis-dobra"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-registro"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-pendentes"] });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? typeof err.response?.data === "string"
          ? err.response.data
          : (err.response?.data as { message?: string })?.message
        : null;
      toast.error(msg || "Não foi possível aprovar.");
    },
  });

  const rejeitarMut = useMutation({
    mutationFn: ({ id, observacao }: { id: number; observacao: string }) =>
      rejeitarAuditoria(id, observacao),
    onSuccess: (_, { id }) => {
      removerCard(id);
      setRejeitarId(null);
      setObsRejeicao("");
      toast.success("Auditoria rejeitada.");
      queryClient.invalidateQueries({ queryKey: ["bonus-disponiveis"] });
      queryClient.invalidateQueries({ queryKey: ["bonus-disponiveis-dobra"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-registro"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-pendentes"] });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? typeof err.response?.data === "string"
          ? err.response.data
          : (err.response?.data as { message?: string })?.message
        : null;
      toast.error(msg || "Não foi possível rejeitar.");
    },
  });

  const abrirRejeitar = (id: number) => {
    setObsRejeicao("");
    setRejeitarId(id);
  };

  const confirmarRejeitar = () => {
    if (rejeitarId == null) return;
    const obs = obsRejeicao.trim();
    if (!obs) {
      toast.error("Informe uma observação para a rejeição.");
      return;
    }
    rejeitarMut.mutate({ id: rejeitarId, observacao: obs });
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl items-center gap-4 py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="industrial-btn-ghost !px-3 !py-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)] sm:text-2xl">Aprovação Bônus</h1>
        </div>
      </header>

      <main className="container max-w-5xl py-6">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="font-medium text-destructive">Erro ao carregar pendentes.</p>
            <button type="button" onClick={() => refetch()} className="industrial-btn-primary mt-4">
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && pendentes.length === 0 && (
          <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-12 text-center text-lg text-muted-foreground">
            Nenhuma auditoria pendente.
          </div>
        )}

        <ul className="grid gap-4 md:grid-cols-2">
          {pendentes.map((a) => (
            <li
              key={a.id}
              className="flex flex-col rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[hsl(214_32%_91%)] pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ID auditoria
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[#1e40af]">{a.id}</p>
                </div>
                <StatusBadge status="P" />
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Número do bônus</dt>
                  <dd className="tabular-nums text-base font-medium text-foreground">
                    {a.numBonus || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">NF</dt>
                  <dd>{a.nf?.trim() ? a.nf : "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Observação</dt>
                  <dd className="text-muted-foreground">{a.observacao?.trim() ? a.observacao : "—"}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={aprovarMut.isPending || rejeitarMut.isPending}
                  onClick={() => aprovarMut.mutate(a.id)}
                  className="industrial-btn-success order-2 w-full sm:order-1 sm:w-auto"
                >
                  {aprovarMut.isPending && aprovarMut.variables === a.id ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Aprovando…
                    </span>
                  ) : (
                    "APROVAR"
                  )}
                </button>
                <button
                  type="button"
                  disabled={aprovarMut.isPending || rejeitarMut.isPending}
                  onClick={() => abrirRejeitar(a.id)}
                  className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-destructive/40 bg-destructive px-6 py-3 text-lg font-semibold text-destructive-foreground shadow-sm transition-all hover:brightness-95 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 sm:order-2 sm:w-auto"
                >
                  REJEITAR
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <Dialog
        open={rejeitarId != null}
        onOpenChange={(open) => {
          if (!open) {
            setRejeitarId(null);
            setObsRejeicao("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => rejeitarMut.isPending && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Rejeitar auditoria</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe a observação para esta rejeição (obrigatório).
          </p>
          <textarea
            value={obsRejeicao}
            onChange={(e) => setObsRejeicao(e.target.value)}
            className="industrial-input min-h-[100px] resize-y"
            placeholder="Motivo da rejeição"
            disabled={rejeitarMut.isPending}
          />
          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              disabled={rejeitarMut.isPending}
              onClick={() => setRejeitarId(null)}
              className="industrial-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={rejeitarMut.isPending}
              onClick={confirmarRejeitar}
              className="inline-flex items-center justify-center rounded-lg border-2 border-destructive/40 bg-destructive px-6 py-3 font-semibold text-destructive-foreground disabled:opacity-40"
            >
              {rejeitarMut.isPending ? "Rejeitando…" : "Confirmar rejeição"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
