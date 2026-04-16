import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { biparDobra, verificarEtiquetaDobra } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DobraRegistradaComLinha } from "@/types/api";
import { playBeep } from "@/lib/beep";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  D: { label: "DOBRADO", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  R: { label: "RETO", className: "bg-blue-100 text-blue-800 border border-blue-300" },
  S: { label: "SOLTO", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  P: { label: "SEPARADO", className: "bg-purple-100 text-purple-800 border border-purple-300" },
};

export default function DobraMateriaisBipagem() {
  const navigate = useNavigate();

  const [codigoBarras, setCodigoBarras] = useState("");
  const [dobras, setDobras] = useState<DobraRegistradaComLinha[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qtBarrasDialog, setQtBarrasDialog] = useState("");
  const inputQtBarrasRef = useRef<HTMLInputElement>(null);
  const [bipando, setBipando] = useState(false);
  const [flashingRowId, setFlashingRowId] = useState<string | null>(null);

  const barrasRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    barrasRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleBiparInitial = useCallback(async () => {
    const codigo = codigoBarras.trim();
    if (!codigo) return;

    setBipando(true);
    try {
      await verificarEtiquetaDobra(codigo);
      // Sucesso na verificação: abre modal e limpa o valor prévio
      setQtBarrasDialog("");
      setIsModalOpen(true);
      setTimeout(() => inputQtBarrasRef.current?.focus(), 100);
    } catch (err: unknown) {
      playBeep(false);
      const ax = err as { response?: { data?: unknown } };
      const raw = ax?.response?.data;
      let msg = "Erro ao verificar etiqueta";
      if (typeof raw === "string" && raw.trim()) msg = raw;
      toast.error(msg);
      setCodigoBarras("");
    } finally {
      setBipando(false);
      barrasRef.current?.focus();
    }
  }, [codigoBarras]);

  const handleConfirmaDobra = useCallback(async () => {
    const codigo = codigoBarras.trim();
    const qtBarrasNum = Number(qtBarrasDialog);

    if (!codigo || !qtBarrasNum || qtBarrasNum <= 0) {
      toast.error("Informe uma quantidade válida.");
      inputQtBarrasRef.current?.focus();
      return;
    }

    setBipando(true);

    try {
      const result = await biparDobra({
        codigoBarras: codigo,
        qtBarras: qtBarrasNum,
      });
      const rowId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const reg = result.dobraRegistrada;
      setDobras((prev) => [{ ...reg, _rowId: rowId }, ...prev]);
      
      setCodigoBarras("");
      setIsModalOpen(false);
      
      playBeep(true);
      toast.success("Dobra registrada!");

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashingRowId(rowId);
      flashTimerRef.current = setTimeout(() => {
        setFlashingRowId(null);
        flashTimerRef.current = null;
      }, 2000);

    } catch (err: unknown) {
      playBeep(false);

      const ax = err as {
        response?: { data?: unknown; status?: number };
        code?: string;
        message?: string;
      };
      const raw = ax?.response?.data;
      let msg = "Erro ao registrar dobra";

      if (ax?.code === "ECONNABORTED") {
        msg = "Timeout: o servidor demorou para responder";
      } else if (ax?.code === "ERR_NETWORK") {
        msg = "Erro de rede ao comunicar com o servidor";
      } else if (typeof raw === "string" && raw.trim()) {
        msg = raw;
      } else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        const detail = r.message ?? r.error ?? r.erro ?? r.detail ?? r.title;
        if (detail) msg = String(detail);
      }

      if (ax?.response?.status) {
        msg += ` (HTTP ${ax.response.status})`;
      }

      toast.error(msg);
    } finally {
      setBipando(false);
      if (!isModalOpen) barrasRef.current?.focus();
    }
  }, [codigoBarras, qtBarrasDialog, isModalOpen]);

  const handleBarrasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBiparInitial();
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="industrial-btn-ghost shrink-0 !px-3 !py-2"
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
            Início
          </button>
          <h1 className="min-w-0 flex-1 text-lg font-bold leading-tight text-[hsl(222_47%_11%)] sm:text-xl">
            <span className="text-[#1e40af]">Dobra de Materiais</span>
          </h1>
          {dobras.length > 0 && (
            <div className="flex w-full items-center justify-end sm:w-auto sm:flex-initial">
              <span className="rounded-full bg-[#1e40af]/10 px-4 py-1.5 text-sm font-semibold text-[#1e40af]">
                {dobras.length} dobra{dobras.length !== 1 ? "s" : ""} na sessão
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">

        <div className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-6 shadow-md">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[hsl(215_16%_47%)]">
              CÓDIGO DE BARRAS DA ETIQUETA
            </label>
            <input
              ref={barrasRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={handleBarrasKeyDown}
              placeholder="Escaneie ou digite e pressione Enter..."
              className="industrial-input font-mono md:text-lg"
              autoComplete="off"
              disabled={bipando}
            />
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(val) => {
           setIsModalOpen(val);
           if (!val) { setCodigoBarras(""); setTimeout(() => barrasRef.current?.focus(), 100); }
        }}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Quantidade da Dobra</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4 text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                Etiqueta: {codigoBarras}
              </p>
              <label className="mb-2 block text-sm font-semibold text-[hsl(215_16%_47%)]">
                Qtd. Real Contada na Dobra
              </label>
              <input
                ref={inputQtBarrasRef}
                type="number"
                min="1"
                value={qtBarrasDialog}
                onChange={(e) => setQtBarrasDialog(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmaDobra();
                  }
                }}
                placeholder="Ex. 10"
                className="industrial-input md:text-lg"
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button 
                className="industrial-btn-ghost px-4 py-2" 
                onClick={() => { setIsModalOpen(false); setCodigoBarras(""); setTimeout(() => barrasRef.current?.focus(), 100); }}
                disabled={bipando}
              >
                Cancelar
              </button>
              <button 
                className="industrial-btn-primary px-4 py-2" 
                onClick={handleConfirmaDobra}
                disabled={bipando}
              >
                {bipando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {dobras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-8 text-center text-lg text-muted-foreground">
            Aguardando a bipagem de uma etiqueta para registro de dobra...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Bônus Lincado</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código de Barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Produto</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Série</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd (Real)</th>
                </tr>
              </thead>
              <tbody>
                {dobras.map((d) => {
                  const flash = flashingRowId === d._rowId;
                  return (
                    <tr
                      key={d._rowId}
                      className={`border-b border-[hsl(214_32%_91%)] last:border-0 ${
                        flash
                          ? "bg-emerald-100/95 transition-colors duration-300"
                          : "even:bg-[hsl(210_40%_98%)]"
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-blue-600">#{d.pcBonusc?.numBonus ?? "N/A"}</td>
                      <td className="px-4 py-3 font-mono text-xs md:text-sm">{d.codigoBarras}</td>
                      <td className="px-4 py-3 font-medium">{d.codProd}</td>
                      <td className="px-4 py-3">{d.numLote}</td>
                      <td className="px-4 py-3">{d.serie}</td>
                      <td className="px-4 py-3 font-bold tabular-nums text-emerald-700">{d.qtBarras}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
