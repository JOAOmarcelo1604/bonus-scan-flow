import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { biparAbertura, verificarEtiquetaAbertura } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AberturaRegistradaComLinha } from "@/types/api";
import { playBeep } from "@/lib/beep";

export default function AberturaMaterialBipagem() {
  const navigate = useNavigate();

  const [codigoBarras, setCodigoBarras] = useState("");
  const [aberturas, setAberturas] = useState<AberturaRegistradaComLinha[]>([]);
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
      const result = await biparAbertura({
        codigoBarras: codigo,
        qtBarras: 0, // Backend will use expected quantity automatically
      });
      const rowId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const reg = result.aberturaRegistrada;
      setAberturas((prev) => [{ ...reg, _rowId: rowId }, ...prev]);
      setCodigoBarras("");
      playBeep(true);
      toast.success("Abertura registrada!");
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashingRowId(rowId);
      flashTimerRef.current = setTimeout(() => {
        setFlashingRowId(null);
        flashTimerRef.current = null;
      }, 2000);
    } catch (err: unknown) {
      playBeep(false);
      const ax = err as { response?: { data?: unknown } };
      const raw = ax?.response?.data;
      let msg = "Erro ao registrar abertura";
      if (typeof raw === "string" && raw.trim()) msg = raw;
      toast.error(msg);
      setCodigoBarras("");
    } finally {
      setBipando(false);
      barrasRef.current?.focus();
    }
  }, [codigoBarras]);

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
            <span className="text-[#0ea5e9]">Abertura de Material</span>
          </h1>
          {aberturas.length > 0 && (
            <div className="flex w-full items-center justify-end sm:w-auto sm:flex-initial">
              <span className="rounded-full bg-[#0ea5e9]/10 px-4 py-1.5 text-sm font-semibold text-[#0ea5e9]">
                {aberturas.length} abertura{aberturas.length !== 1 ? "s" : ""} na sessão
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
              placeholder="Escaneie para registrar a abertura imediata..."
              className="industrial-input font-mono md:text-lg focus:ring-[#0ea5e9]"
              autoComplete="off"
              disabled={bipando}
            />
            <p className="mt-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Bipe a etiqueta para confirmar que o material foi aberto.
            </p>
          </div>
        </div>

        {aberturas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-12 text-center">
            <div className="mb-4 flex justify-center text-muted-foreground/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3z"/><path d="M12 8v8"/><path d="M8 12h8"/>
               </svg>
            </div>
            <p className="text-lg text-muted-foreground">Aguardando a bipagem de uma etiqueta...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Bônus</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código de Barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Produto</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Série</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd (Real)</th>
                </tr>
              </thead>
              <tbody>
                {aberturas.map((d) => {
                  const flash = flashingRowId === d._rowId;
                  return (
                    <tr
                      key={d._rowId}
                      className={`border-b border-[hsl(214_32%_91%)] last:border-0 ${flash ? "bg-emerald-100/95 transition-colors duration-300" : "even:bg-[hsl(210_40%_98%)]"}`}
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
