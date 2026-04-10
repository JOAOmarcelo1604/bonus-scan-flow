import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import {
  aprovarInventarioItem,
  aprovarInventarioTodos,
  listarInventarioPendentes,
  reprovarInventario,
} from "@/services/api";
import type { InventarioItem } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PENDENTES_KEY = ["inventario-pendentes"] as const;

function labelStatus(s: string | undefined) {
  if (!s) return "—";
  const u = s.toUpperCase();
  if (u === "R" || u === "RETO") return "RETO";
  if (u === "D" || u === "DOBRADO") return "DOBRADO";
  if (u === "S" || u === "SOLTO") return "SOLTO";
  if (u === "P" || u === "SEPARADO") return "SEPARADO";
  return s;
}

export default function InventarioAprovacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reprovarId, setReprovarId] = useState<number | null>(null);
  const [obsReprovar, setObsReprovar] = useState("");

  const { data: pendentes = [], isLoading, isError, refetch } = useQuery({
    queryKey: PENDENTES_KEY,
    queryFn: listarInventarioPendentes,
  });

  const removerCard = (id: number) => {
    queryClient.setQueryData<InventarioItem[]>(PENDENTES_KEY, (old) =>
      (old ?? []).filter((a) => a.id !== id),
    );
  };

  const aprovarMut = useMutation({
    mutationFn: aprovarInventarioItem,
    onSuccess: (_, id) => {
      removerCard(id);
      toast.success("Item aprovado.");
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-registro"] });
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

  const aprovarTodosMut = useMutation({
    mutationFn: aprovarInventarioTodos,
    onSuccess: () => {
      queryClient.setQueryData(PENDENTES_KEY, []);
      toast.success("Todos os itens foram aprovados.");
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-registro"] });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? typeof err.response?.data === "string"
          ? err.response.data
          : (err.response?.data as { message?: string })?.message
        : null;
      toast.error(msg || "Não foi possível aprovar todos.");
    },
  });

  const reprovarMut = useMutation({
    mutationFn: ({ id, observacao }: { id: number; observacao: string }) =>
      reprovarInventario(id, { observacao }),
    onSuccess: (_, { id }) => {
      removerCard(id);
      setReprovarId(null);
      setObsReprovar("");
      toast.success("Item reprovado.");
      queryClient.invalidateQueries({ queryKey: ["inventario-pagina"] });
      queryClient.invalidateQueries({ queryKey: ["inventario-registro"] });
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? typeof err.response?.data === "string"
          ? err.response.data
          : (err.response?.data as { message?: string })?.message
        : null;
      toast.error(msg || "Não foi possível reprovar.");
    },
  });

  const abrirReprovar = (id: number) => {
    setObsReprovar("");
    setReprovarId(id);
  };

  const confirmarReprovar = () => {
    if (reprovarId == null) return;
    const obs = obsReprovar.trim();
    if (!obs) {
      toast.error("Informe uma observação para a reprovação.");
      return;
    }
    reprovarMut.mutate({ id: reprovarId, observacao: obs });
  };

  const busy =
    aprovarMut.isPending ||
    reprovarMut.isPending ||
    aprovarTodosMut.isPending;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
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
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)] sm:text-2xl">Aprovação de inventário</h1>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/inventario/registro")}
              className="industrial-btn-ghost text-sm"
            >
              Registro
            </button>
            <button
              type="button"
              onClick={() => navigate("/inventario")}
              className="industrial-btn-ghost text-sm"
            >
              Consulta
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-6">
        {pendentes.length > 0 && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => aprovarTodosMut.mutate()}
              className="industrial-btn-success"
            >
              {aprovarTodosMut.isPending ? "Aprovando…" : "Aprovar todos"}
            </button>
          </div>
        )}

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
            Nenhum item de inventário pendente de aprovação.
          </div>
        )}

        <ul className="grid gap-4 md:grid-cols-2">
          {pendentes.map((item) => (
            <li
              key={item.id}
              className="flex flex-col rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[hsl(214_32%_91%)] pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ID
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[#1e40af]">{item.id}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  Pendente
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Código de barras</dt>
                  <dd className="break-all font-mono text-xs">{item.codigoBarras?.trim() ? item.codigoBarras : "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Produto</dt>
                  <dd>{item.codProd?.trim() ? item.codProd : "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Bônus</dt>
                  <dd className="tabular-nums">
                    {item.numBonus ?? item.pcBonusc?.numBonus ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(215_16%_35%)]">Status</dt>
                  <dd>{labelStatus(item.status)}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => aprovarMut.mutate(item.id)}
                  className="industrial-btn-success order-2 w-full sm:order-1 sm:w-auto"
                >
                  {aprovarMut.isPending && aprovarMut.variables === item.id ? "Aprovando…" : "Aprovar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => abrirReprovar(item.id)}
                  className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-destructive/40 bg-destructive px-6 py-3 text-lg font-semibold text-destructive-foreground shadow-sm transition-all hover:brightness-95 sm:order-2 sm:w-auto"
                >
                  Reprovar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <Dialog
        open={reprovarId != null}
        onOpenChange={(open) => {
          if (!open) {
            setReprovarId(null);
            setObsReprovar("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => reprovarMut.isPending && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Reprovar item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe a observação (obrigatório), conforme o corpo de{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">PUT /api/inventario/reprovar/{"{id}"}</code>.
          </p>
          <textarea
            value={obsReprovar}
            onChange={(e) => setObsReprovar(e.target.value)}
            className="industrial-input min-h-[100px] resize-y"
            placeholder="Ex.: Peso divergente"
            disabled={reprovarMut.isPending}
          />
          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              disabled={reprovarMut.isPending}
              onClick={() => setReprovarId(null)}
              className="industrial-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={reprovarMut.isPending}
              onClick={confirmarReprovar}
              className="inline-flex items-center justify-center rounded-lg border-2 border-destructive/40 bg-destructive px-6 py-3 font-semibold text-destructive-foreground disabled:opacity-40"
            >
              {reprovarMut.isPending ? "Reprovando…" : "Confirmar reprovação"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
