import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aprovarInventario,
  listarInventariosPendentes,
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

const PENDENTES_KEY = ["inventario-pendentes"] as const;

export default function InventarioAprovacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selecionado, setSelecionado] = useState<InventarioModel | null>(null);
  const [itensDetalhados, setItensDetalhados] = useState<InventarioItem[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const { data: pendentes = [], isLoading, isError, refetch } = useQuery({
    queryKey: PENDENTES_KEY,
    queryFn: listarInventariosPendentes,
    refetchInterval: 15000,
  });

  const aprovarMut = useMutation({
    mutationFn: (id: number) => aprovarInventario(id),
    onSuccess: () => {
      toast.success("Inventário aprovado com sucesso!");
      setSelecionado(null);
      queryClient.invalidateQueries({ queryKey: PENDENTES_KEY });
    },
    onError: () => toast.error("Erro ao aprovar inventário."),
  });

  const reprovarMut = useMutation({
    mutationFn: (id: number) => reprovarInventario(id),
    onSuccess: () => {
      toast.success("Inventário rejeitado e devolvido para ajuste.");
      setSelecionado(null);
      queryClient.invalidateQueries({ queryKey: PENDENTES_KEY });
    },
    onError: () => toast.error("Erro ao rejeitar inventário."),
  });

  const abrirDetalhes = async (inv: InventarioModel) => {
    setSelecionado(inv);
    setCarregandoDetalhes(true);
    try {
        const itens = await listarItensInventario(inv.id);
        setItensDetalhados(itens);
    } catch (err) {
        toast.error("Erro ao carregar itens do inventário.");
    } finally {
        setCarregandoDetalhes(false);
    }
  };

  const busy = aprovarMut.isPending || reprovarMut.isPending;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button onClick={() => navigate("/inventario/registro")} className="industrial-btn-ghost !px-3 !py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Voltar ao Registro
          </button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)]">Aprovação de Inventário</h1>
        </div>
      </header>

      <main className="container max-w-5xl py-6">
        {isLoading && <div className="text-center py-10">Buscando inventários pendentes...</div>}
        
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
            Erro ao carregar dados. <button onClick={() => refetch()} className="underline ml-2">Tentar novamente</button>
          </div>
        )}

        {!isLoading && !isError && pendentes.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
            Nenhum inventário aguardando aprovação no momento.
          </div>
        )}

        <div className="grid gap-4">
          {pendentes.map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm transition-all hover:border-blue-300">
              <div>
                <h3 className="text-lg font-bold text-[#1e40af]">Inventário #{inv.id}</h3>
                <p className="text-sm text-gray-500">Ref: {new Date(inv.dataReferencia).toLocaleDateString()}</p>
                <div className="mt-1 flex gap-4 text-xs font-semibold text-gray-400">
                    <span>Usuário: {inv.usuarioAbertura}</span>
                    <span>Peso Total: {inv.pesoTotal?.toFixed(2)} kg</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                    onClick={() => abrirDetalhes(inv)}
                    className="industrial-btn-ghost text-sm"
                >
                  Ver Itens
                </button>
                <button
                    disabled={busy}
                    onClick={() => { if(confirm("Aprovar este inventário?")) aprovarMut.mutate(inv.id); }}
                    className="industrial-btn-success text-sm"
                >
                  Aprovar
                </button>
                <button
                    disabled={busy}
                    onClick={() => { if(confirm("Rejeitar este inventário? Ele voltará para correção.")) reprovarMut.mutate(inv.id); }}
                    className="industrial-btn-destructive text-sm"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={selecionado !== null} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Itens do Inventário #{selecionado?.id}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-[300px]">
             {carregandoDetalhes ? (
                 <div className="text-center py-20">Carregando detalhes...</div>
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
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase font-bold text-gray-600">
                                        {item.statusEtiqueta}
                                    </span>
                                </td>
                                <td className="px-4 py-2 font-bold">{item.quantidade}</td>
                                <td className="px-4 py-2">{item.peso?.toFixed(2) || '—'} kg</td>
                                <td className="px-4 py-2 text-xs font-mono">
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
            <button onClick={() => setSelecionado(null)} className="industrial-btn-ghost">
              Fechar
            </button>
            <button
                disabled={busy}
                onClick={() => { if(confirm("Confirmar aprovação?")) aprovarMut.mutate(selecionado!.id); }}
                className="industrial-btn-success"
            >
              Aprovar Inventário
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
