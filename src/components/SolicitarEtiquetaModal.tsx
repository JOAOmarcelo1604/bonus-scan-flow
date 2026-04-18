import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { criarSolicitacaoEtiqueta } from "@/services/api";

interface SolicitarEtiquetaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numBonus: number;
  codProd: number;
  descricaoProd: string;
}

export function SolicitarEtiquetaModal({ open, onOpenChange, numBonus, codProd, descricaoProd }: SolicitarEtiquetaModalProps) {
  const [tipoGeracao, setTipoGeracao] = useState<"peso" | "quantidade">("peso");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSolicitar = async () => {
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      await criarSolicitacaoEtiqueta({
        numBonus,
        codProd,
        tipoGeracao: tipoGeracao.toUpperCase(),
        peso: tipoGeracao === "peso" ? Number(valor) : undefined,
        qtde: tipoGeracao === "quantidade" ? Number(valor) : undefined,
        status: "PENDENTE"
      });
      
      toast.success("Solicitação enviada com sucesso!");
      onOpenChange(false);
      setValor("");
    } catch (err) {
      toast.error("Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Solicitar Nova Etiqueta</DialogTitle>
          <DialogDescription>
            Produto: <span className="font-bold text-foreground">{codProd} - {descricaoProd}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Como deseja gerar?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  checked={tipoGeracao === "peso"}
                  onChange={() => setTipoGeracao("peso")}
                />
                Por Peso
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  checked={tipoGeracao === "quantidade"}
                  onChange={() => setTipoGeracao("quantidade")}
                />
                Por Quantidade
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {tipoGeracao === "peso" ? "Peso (em kg)" : "Quantidade (peças)"}
            </label>
            <input
              type="number"
              className="industrial-input"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={tipoGeracao === "peso" ? "Ex: 1500" : "Ex: 10"}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSolicitar} disabled={loading}>
            {loading ? "Enviando..." : "Confirmar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
