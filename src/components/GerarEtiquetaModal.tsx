import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { gerarEtiquetaCustomizada, imprimirEtiqueta } from "@/services/api";

interface GerarEtiquetaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numBonus: number;
  onBiparManual: (codigo: string) => Promise<void>;
}

export function GerarEtiquetaModal({ open, onOpenChange, numBonus, onBiparManual }: GerarEtiquetaModalProps) {
  const [codigoProduto, setCodigoProduto] = useState("");
  const [tipoGeracao, setTipoGeracao] = useState<"peso" | "quantidade">("peso");
  const [peso, setPeso] = useState("");
  const [loading, setLoading] = useState(false);
  const [etiquetaGerada, setEtiquetaGerada] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setCodigoProduto("");
      setPeso("");
      setEtiquetaGerada(null);
    }
    onOpenChange(isOpen);
  };

  const handleGerar = async () => {
    if (!codigoProduto.trim() || !peso.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const response = await gerarEtiquetaCustomizada({
        numBonus,
        codigoProduto,
        tipoGeracao,
        pesoOuQuantidade: peso
      });
      setEtiquetaGerada(response.codigoBarrasGerado);
      toast.success("Etiqueta gerada com sucesso!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Erro ao gerar etiqueta");
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    if (!etiquetaGerada) return;
    try {
      toast.info("Enviando comando para a impressora...");
      await imprimirEtiqueta({
        codigo_produto: codigoProduto,
        numero_bonus: numBonus,
        peso: peso,
        numero_etiqueta: etiquetaGerada,
        impressora: "ZD230"
      });
      toast.success("Comando enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao imprimir a etiqueta");
    }
  };

  const handleBipar = async () => {
    if (!etiquetaGerada) return;
    try {
      await onBiparManual(etiquetaGerada);
      handleOpenChange(false); // fechar o modal
    } catch (e) {
      // erro seria toastado lá na pagina ou não
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerar Nova Etiqueta</DialogTitle>
          <DialogDescription>
            Gere uma nova etiqueta válida para o fornecedor do bônus atual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium">Código do Produto *</label>
            <input 
              type="text"
              value={codigoProduto}
              onChange={(e) => setCodigoProduto(e.target.value)}
              className="industrial-input"
              placeholder="Ex: 20334"
              disabled={loading || etiquetaGerada != null}
            />
          </div>
          
          <div className="flex flex-col space-y-2 py-1">
            <label className="text-sm font-medium">Você quer preencher com:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoGeracao"
                  value="peso"
                  checked={tipoGeracao === "peso"}
                  onChange={() => setTipoGeracao("peso")}
                  disabled={loading || etiquetaGerada != null}
                />
                Peso
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoGeracao"
                  value="quantidade"
                  checked={tipoGeracao === "quantidade"}
                  onChange={() => setTipoGeracao("quantidade")}
                  disabled={loading || etiquetaGerada != null}
                />
                Quantidade
              </label>
            </div>
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium">
              {tipoGeracao === "peso" ? "Peso do Produto *" : "Quantidade de Peças *"}
            </label>
            <input 
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              className="industrial-input"
              placeholder="Ex: 1500"
              disabled={loading || etiquetaGerada != null}
            />
          </div>
        </div>

        {etiquetaGerada && (
          <div className="mt-2 rounded-md bg-muted p-4 text-center border">
            <p className="text-sm text-muted-foreground mb-1">Código Gerado:</p>
            <p className="font-mono text-lg font-bold break-all">{etiquetaGerada}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 shrink-0">
          {!etiquetaGerada ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleGerar} disabled={loading}>
                {loading ? "Gerando..." : "Gerar Etiqueta"}
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full flex-wrap justify-end">
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(etiquetaGerada);
                toast.success("Copiado!");
              }}>
                Copiar
              </Button>
              <Button variant="secondary" onClick={handleImprimir}>
                Imprimir
              </Button>
              <Button onClick={handleBipar}>
                Bipar Agora
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
