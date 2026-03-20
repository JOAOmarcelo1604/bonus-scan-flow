import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { biparEtiqueta, enviarAuditoria } from "@/services/api";
import type { EtiquetaLida } from "@/types/api";
import { EtiquetaTable } from "@/components/EtiquetaTable";
import { AuditoriaButton } from "@/components/AuditoriaButton";
import { playBeep } from "@/lib/beep";

export default function RecebimentoBonus() {
  const navigate = useNavigate();
  const [numBonus, setNumBonus] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [etiquetas, setEtiquetas] = useState<EtiquetaLida[]>([]);
  const [bipando, setBipando] = useState(false);
  const [erro, setErro] = useState("");

  const barrasRef = useRef<HTMLInputElement>(null);

  const handleBonusKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (numBonus.trim()) barrasRef.current?.focus();
    }
  };

  const handleBipar = useCallback(async () => {
    if (!numBonus.trim() || !codigoBarras.trim()) return;
    setErro("");
    setBipando(true);

    try {
      const result = await biparEtiqueta({
        codigoBarras: codigoBarras.trim(),
        numBonus: Number(numBonus),
      });
      setEtiquetas((prev) => [result, ...prev]);
      setCodigoBarras("");
      playBeep(true);
    } catch (err: any) {
      playBeep(false);
      const msg = err?.response?.data?.message || err?.response?.data || "Erro ao bipar etiqueta";
      const status = err?.response?.status;

      if (typeof msg === "string") {
        if (msg.toLowerCase().includes("fornecedor") && msg.toLowerCase().includes("padrão")) {
          toast.warning("Fornecedor sem padrão de etiqueta cadastrado");
        } else if (msg.toLowerCase().includes("fornecedor")) {
          toast.error("Fornecedor não cadastrado");
        } else if (msg.toLowerCase().includes("bônus") || msg.toLowerCase().includes("bonus")) {
          toast.error("Bônus inválido");
        } else {
          toast.error(String(msg));
        }
        setErro(String(msg));
      } else {
        toast.error(`Erro ${status || "desconhecido"}`);
        setErro("Erro ao processar bipagem");
      }
    } finally {
      setBipando(false);
      barrasRef.current?.focus();
    }
  }, [numBonus, codigoBarras]);

  const handleBarrasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBipar();
    }
  };

  const handleEnviarAuditoria = async (nf: string, observacao: string) => {
    await enviarAuditoria({
      numBonus: Number(numBonus),
      nf,
      observacao,
    });
    toast.success("Enviado para auditoria com sucesso!");
    setEtiquetas([]);
    setCodigoBarras("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
        <div className="container flex items-center gap-4 py-4">
          <button onClick={() => navigate("/")} className="industrial-btn-ghost !px-3 !py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Voltar
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Recebimento Bônus</h1>
          </div>
          {etiquetas.length > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
              <span className="text-sm font-semibold text-primary">{etiquetas.length}</span>
              <span className="text-xs text-muted-foreground">etiqueta{etiquetas.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-4xl space-y-6 py-6">
        {/* Form */}
        <div className="animate-slide-up rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto]">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">Nº BÔNUS</label>
              <input
                type="number"
                value={numBonus}
                onChange={(e) => setNumBonus(e.target.value)}
                onKeyDown={handleBonusKeyDown}
                placeholder="Ex: 12345"
                className="industrial-input"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">CÓDIGO DE BARRAS</label>
              <input
                ref={barrasRef}
                type="text"
                value={codigoBarras}
                onChange={(e) => { setCodigoBarras(e.target.value); setErro(""); }}
                onKeyDown={handleBarrasKeyDown}
                placeholder="Escaneie ou digite o código"
                className="industrial-input font-mono"
                autoComplete="off"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleBipar}
                disabled={bipando || !numBonus.trim() || !codigoBarras.trim()}
                className="industrial-btn-primary w-full sm:w-auto"
              >
                {bipando ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8V6a2 2 0 012-2h3"/><path d="M17 4h3a2 2 0 012 2v2"/><path d="M22 16v2a2 2 0 01-2 2h-3"/><path d="M7 20H4a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
                )}
                BIPAR
              </button>
            </div>
          </div>

          {erro && (
            <p className="mt-3 text-sm font-medium text-destructive">{erro}</p>
          )}
        </div>

        {/* Table */}
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <EtiquetaTable etiquetas={etiquetas} />
        </div>

        {/* Auditoria */}
        <div className="animate-slide-up flex justify-end" style={{ animationDelay: "200ms" }}>
          <AuditoriaButton
            disabled={etiquetas.length === 0 || !numBonus.trim()}
            numBonus={Number(numBonus)}
            onConfirm={handleEnviarAuditoria}
          />
        </div>
      </main>
    </div>
  );
}
