import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { reimprimirEtiqueta } from "@/services/api";

interface ModalReimpressaoProps {
  codigoBarras: string;
  vias: number;
  usuario: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ModalReimpressao({ codigoBarras, vias, usuario, onClose, onSuccess }: ModalReimpressaoProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleConfirmar() {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da reimpressão.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await reimprimirEtiqueta(codigoBarras, usuario, motivo.trim());
      toast.success(`Etiqueta ${codigoBarras} enviada para reimpressão.`);
      onSuccess();
    } catch {
      toast.error("Falha ao reimprimir etiqueta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Reimprimir Etiqueta</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Etiqueta</p>
          <p className="font-mono text-sm font-medium text-foreground">{codigoBarras}</p>
        </div>

        <div className="mb-4">
          <label htmlFor="motivo-reimpressao" className="mb-1.5 block text-sm font-medium text-foreground">
            Motivo da reimpressão <span className="text-red-500">*</span>
          </label>
          <textarea
            ref={inputRef}
            id="motivo-reimpressao"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex.: Etiqueta danificada, ilegível..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {vias > 1 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Esta etiqueta já possui <strong>{vias} {vias === 1 ? "via" : "vias"}</strong> impressas.
              A reimpressão gerará a <strong>{vias + 1}ª via</strong>.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Reimprimir
          </button>
        </div>
      </div>
    </div>
  );
}

interface BotaoReimprimirProps {
  codigoBarras: string;
  vias: number;
  usuario: string;
  onSuccess?: () => void;
}

export function BotaoReimprimir({ codigoBarras, vias, usuario, onSuccess }: BotaoReimprimirProps) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalAberto(true)}
        title="Reimprimir etiqueta"
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Reimprimir
      </button>

      {modalAberto && (
        <ModalReimpressao
          codigoBarras={codigoBarras}
          vias={vias}
          usuario={usuario}
          onClose={() => setModalAberto(false)}
          onSuccess={() => {
            setModalAberto(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}
