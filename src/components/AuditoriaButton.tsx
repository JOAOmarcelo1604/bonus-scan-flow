import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AuditoriaButtonProps {
  disabled: boolean;
  numBonus: number;
  onConfirm: (nf: string, observacao: string) => Promise<void>;
}

export function AuditoriaButton({ disabled, numBonus, onConfirm }: AuditoriaButtonProps) {
  const [open, setOpen] = useState(false);
  const [nf, setNf] = useState("");
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(nf, obs);
      setOpen(false);
      setNf("");
      setObs("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="industrial-btn-success w-full sm:w-auto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Enviar para Auditoria
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Auditoria</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Deseja enviar o bônus <strong className="text-foreground">{numBonus}</strong> para auditoria?
          </p>
          <div className="space-y-3 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">NF (opcional)</label>
              <input
                value={nf}
                onChange={(e) => setNf(e.target.value)}
                className="industrial-input"
                placeholder="Nota Fiscal"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Observação (opcional)</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="industrial-input min-h-[80px] resize-y"
                placeholder="Observação"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="industrial-btn-ghost">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="industrial-btn-primary"
            >
              {loading ? "Enviando…" : "Confirmar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
