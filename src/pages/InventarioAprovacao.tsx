import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aprovarInventario,
  listarTodosInventarios,
  reprovarInventario,
  listarItensInventario,
} from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventarioModel, InventarioItem } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";

const TODOS_KEY = ["inventario-todos"] as const;

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  EM_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
};

function badgeStatusClass(status: string) {
  if (status === "APROVADO") return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (status === "EM_APROVACAO") return "bg-amber-100 text-amber-900 border border-amber-200";
  if (status === "ABERTO") return "bg-blue-100 text-blue-800 border border-blue-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
}

function formatarDataReferencia(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

function formatarDataHoraAprovacao(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR");
}

export default function InventarioAprovacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selecionado, setSelecionado] = useState<InventarioModel | null>(null);
  const [itensDetalhados, setItensDetalhados] = useState<InventarioItem[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const { data: todos = [], isLoading, isError, refetch } = useQuery({
    queryKey: TODOS_KEY,
    queryFn: listarTodosInventarios,
    refetchInterval: 15000,
  });

  const pendentesCount = useMemo(
    () => todos.filter((i) => i.status === "EM_APROVACAO").length,
    [todos],
  );

  const usuarioAprovador = user?.userCode?.trim() || "SISTEMA";

  const aprovarMut = useMutation({
    mutationFn: (id: number) => aprovarInventario(id, usuarioAprovador),
    onSuccess: () => {
      toast.success("Inventário aprovado com sucesso!");
      setSelecionado(null);
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: unknown } }).response?.data === "string"
          ? String((err as { response: { data: string } }).response.data)
          : "Erro ao aprovar inventário.";
      toast.error(msg);
    },
  });

  const reprovarMut = useMutation({
    mutationFn: (id: number) => reprovarInventario(id),
    onSuccess: () => {
      toast.success("Inventário rejeitado e devolvido para ajuste.");
      setSelecionado(null);
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
    onError: () => toast.error("Erro ao rejeitar inventário."),
  });

  const abrirDetalhes = async (inv: InventarioModel) => {
    setSelecionado(inv);
    setCarregandoDetalhes(true);
    try {
      const itens = await listarItensInventario(inv.id);
      setItensDetalhados(itens);
    } catch {
      toast.error("Erro ao carregar itens do inventário.");
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const busy = aprovarMut.isPending || reprovarMut.isPending;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-6xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/inventario/registro")}
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
            Voltar ao Registro
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[hsl(222_47%_11%)]">Aprovação de Inventário</h1>
            <p className="text-sm text-muted-foreground">
              Listagem de todas as sessões · {pendentesCount > 0 ? `${pendentesCount} aguardando aprovação` : "Nenhuma pendente"}
            </p>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-6">
        {isLoading && <div className="py-10 text-center">Carregando inventários...</div>}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
            Erro ao carregar dados.{" "}
            <button type="button" onClick={() => refetch()} className="ml-2 underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && todos.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
            Nenhum inventário cadastrado ainda.
          </div>
        )}

        {!isLoading && !isError && todos.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Sessão</th>
                  <th className="whitespace-nowrap px-4 py-3">Data ref.</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Aberto por</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Peso (kg)</th>
                  <th className="whitespace-nowrap px-4 py-3">Aprovado em</th>
                  <th className="whitespace-nowrap px-4 py-3">Aprovado por</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todos.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-blue-900">#{inv.id}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatarDataReferencia(inv.dataReferencia)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${badgeStatusClass(inv.status)}`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td
                      className="max-w-[140px] truncate px-4 py-3 text-gray-700"
                      title={inv.nomeAbertura || inv.usuarioAbertura}
                    >
                      {inv.nomeAbertura || inv.usuarioAbertura || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                      {inv.pesoTotal?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700 tabular-nums">
                      {formatarDataHoraAprovacao(inv.dataHoraAprovacao)}
                    </td>
                    <td
                      className="max-w-[120px] truncate px-4 py-3 text-gray-700"
                      title={inv.nomeAprovacao || inv.usuarioAprovacao}
                    >
                      {inv.nomeAprovacao || inv.usuarioAprovacao || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirDetalhes(inv)}
                          className="industrial-btn-ghost !px-2.5 !py-1.5 text-xs"
                        >
                          Itens
                        </button>
                        {inv.status === "EM_APROVACAO" && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm("Aprovar este inventário?")) aprovarMut.mutate(inv.id);
                              }}
                              className="industrial-btn-success !px-2.5 !py-1.5 text-xs"
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm("Rejeitar este inventário? Ele voltará para correção."))
                                  reprovarMut.mutate(inv.id);
                              }}
                              className="industrial-btn-destructive !px-2.5 !py-1.5 text-xs"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Dialog open={selecionado !== null} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Itens do Inventário #{selecionado?.id}</DialogTitle>
          </DialogHeader>

          <div className="min-h-[300px] flex-1 overflow-y-auto">
            {carregandoDetalhes ? (
              <div className="py-20 text-center">Carregando detalhes...</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Produto</th>
                    <th className="px-4 py-2 font-semibold">Tipo</th>
                    <th className="px-4 py-2 font-semibold">Qtd</th>
                    <th className="px-4 py-2 font-semibold">Peso Est.</th>
                    <th className="px-4 py-2 font-semibold">Etiqueta/Pedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {itensDetalhados.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{item.codProd}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                          {item.statusEtiqueta}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold">{item.quantidade}</td>
                      <td className="px-4 py-2">{item.peso?.toFixed(2) || "—"} kg</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {item.etiqueta?.startsWith("MAN-")
                          ? "Manual"
                          : item.etiqueta || (item.numPed ? `PED: ${item.numPed}` : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <button type="button" onClick={() => setSelecionado(null)} className="industrial-btn-ghost">
              Fechar
            </button>
            {selecionado?.status === "EM_APROVACAO" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Confirmar aprovação?")) aprovarMut.mutate(selecionado.id);
                }}
                className="industrial-btn-success"
              >
                Aprovar Inventário
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
