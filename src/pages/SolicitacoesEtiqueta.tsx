import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  listarSolicitacoesPendentes, 
  concluirSolicitacaoEtiqueta, 
  gerarEtiquetaCustomizada, 
  imprimirEtiqueta 
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function SolicitacoesEtiqueta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Mapa de ID da solicitação -> Código de barras gerado
  const [codigosGerados, setCodigosGerados] = useState<Record<number, string>>({});
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  const { data: solicitacoes, isLoading, isError } = useQuery({
    queryKey: ["solicitacoes-pendentes"],
    queryFn: listarSolicitacoesPendentes,
  });

  const concluirMutation = useMutation({
    mutationFn: concluirSolicitacaoEtiqueta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solicitacoes-pendentes"] });
    },
    onError: () => {
      toast.error("Erro ao concluir solicitação no sistema");
    }
  });

  const handleGerar = async (s: any) => {
    setProcessandoId(s.id);
    try {
      const valorStr = s.tipoGeracao === "PESO" ? String(s.peso) : String(s.qtde);
      
      const res = await gerarEtiquetaCustomizada({
        numBonus: s.numBonus,
        codigoProduto: String(s.codProd),
        tipoGeracao: s.tipoGeracao.toLowerCase() as "peso" | "quantidade",
        pesoOuQuantidade: valorStr
      });

      setCodigosGerados(prev => ({ ...prev, [s.id]: res.codigoBarrasGerado }));
      toast.success("Etiqueta gerada com sucesso!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erro ao gerar etiqueta");
    } finally {
      setProcessandoId(null);
    }
  };

  const handleImprimir = async (s: any, codigo: string) => {
    try {
      toast.info("Enviando para impressora...");
      const valorStr = s.tipoGeracao === "PESO" ? String(s.peso) : String(s.qtde);
      
      await imprimirEtiqueta({
        codigo_produto: String(s.codProd),
        numero_bonus: s.numBonus,
        peso: valorStr,
        numero_etiqueta: codigo,
        impressora: "ZD230"
      });

      toast.success("Impresso com sucesso!");
      
      // Baixa automática após imprimir
      await concluirMutation.mutateAsync(s.id);
      toast.info("Solicitação concluída automaticamente.");
    } catch (err) {
      toast.error("Erro ao imprimir");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl items-center gap-3 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)]">
            Solicitações de Etiquetas
          </h1>
        </div>
      </header>

      <main className="container max-w-5xl py-6">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Carregando solicitações...</div>
        ) : isError ? (
          <div className="text-center py-10 text-destructive">Erro ao carregar solicitações</div>
        ) : !solicitacoes || solicitacoes.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-white rounded-xl border border-dashed border-[hsl(214_32%_91%)]">
            Nenhuma solicitação pendente no momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solicitacoes.map((s) => {
              const codigoGerado = codigosGerados[s.id];
              return (
                <div key={s.id} className="bg-white rounded-xl border border-[hsl(214_32%_91%)] p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold text-[#1e40af] bg-[#1e40af]/10 px-2 py-1 rounded">
                        BÔNUS #{s.numBonus}
                      </span>
                      <h3 className="text-sm font-bold mt-2">Produto: {s.codProd}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tipo: </span>
                      <span className="font-semibold">{s.tipoGeracao}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-semibold">
                        {s.tipoGeracao === "PESO" ? `${s.peso} kg` : `${s.qtde} pçs`}
                      </span>
                    </p>
                    <p className="text-xs">
                      <span className="text-muted-foreground">Solicitado por: </span>
                      <span className="font-medium">Func. #{s.codFuncSolicitacao}</span>
                    </p>
                  </div>

                  {codigoGerado && (
                    <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-center">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">CÓDIGO GERADO</p>
                      <p className="font-mono text-sm font-bold text-emerald-900 break-all">{codigoGerado}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!codigoGerado ? (
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs bg-[#1e40af] hover:bg-[#1e3a8a]"
                        onClick={() => handleGerar(s)}
                        disabled={processandoId === s.id}
                      >
                        {processandoId === s.id ? "Gerando..." : "Gerar Etiqueta"}
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleImprimir(s, codigoGerado)}
                        disabled={concluirMutation.isPending}
                      >
                        {concluirMutation.isPending ? "Concluindo..." : "Imprimir"}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => navigate(`/recebimento-bonus/${s.numBonus}`)}
                    >
                      Ver Bônus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

