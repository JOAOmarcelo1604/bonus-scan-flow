import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  biparEtiqueta,
  COD_FILIAL_RECEBIMENTO_BONUS,
  enviarAuditoria,
  listarBonusDisponiveisRecebimento,
  listarEtiquetasByBonus,
  listarProdutosBonus,
} from "@/services/api";
import type { BonusDisponivel, EtiquetaLidaComLinha } from "@/types/api";
import { EtiquetaTable } from "@/components/EtiquetaTable";
import { BonusProdutosTable } from "@/components/BonusProdutosTable";
import { AuditoriaButton } from "@/components/AuditoriaButton";
import { playBeep } from "@/lib/beep";
import { normalizarListaProdutosBonus } from "@/lib/bonusProduto";

import { GerarEtiquetaModal } from "@/components/GerarEtiquetaModal";

function nomeFornecedorCard(fornecedorCompleto: string) {
  const idx = fornecedorCompleto.indexOf(" - ");
  if (idx === -1) return fornecedorCompleto.trim();
  return fornecedorCompleto.slice(idx + 3).trim() || fornecedorCompleto;
}

export default function RecebimentoBonusBipagem() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { numBonus: numBonusParam } = useParams<{ numBonus: string }>();
  const location = useLocation();
  const stateBonus = (location.state as { bonus?: BonusDisponivel } | null)?.bonus;

  const numBonus = Number(numBonusParam);
  const numBonusValido = Number.isFinite(numBonus) && numBonus > 0;

  const { data: listaBonus } = useQuery({
    queryKey: ["bonus-disponiveis", COD_FILIAL_RECEBIMENTO_BONUS],
    queryFn: () => listarBonusDisponiveisRecebimento(COD_FILIAL_RECEBIMENTO_BONUS),
    enabled: numBonusValido && !stateBonus,
  });

  const bonusMeta =
    stateBonus?.NUMBONUS === numBonus
      ? stateBonus
      : listaBonus?.find((b) => b.NUMBONUS === numBonus);

  const tituloFornecedor = bonusMeta
    ? nomeFornecedorCard(bonusMeta.FORNECEDOR)
    : "—";

  const {
    data: produtosRaw,
    isLoading: produtosLoading,
    isError: produtosErro,
    error: produtosErrorObj,
    refetch: refetchProdutos,
  } = useQuery({
    queryKey: ["bonus-produtos", numBonus],
    queryFn: () => listarProdutosBonus(numBonus),
    enabled: numBonusValido,
  });

  const produtosLinhas = useMemo(
    () => normalizarListaProdutosBonus(produtosRaw),
    [produtosRaw],
  );

  const { data: etiquetasExistentes, error: erroEtiquetasExistentes } = useQuery({
    queryKey: ["etiquetas-bonus", numBonus],
    queryFn: () => listarEtiquetasByBonus(numBonus),
    enabled: numBonusValido,
  });

  useEffect(() => {
    if (erroEtiquetasExistentes) {
      console.error("[etiquetas-bonus] erro ao carregar etiquetas anteriores:", erroEtiquetasExistentes);
    }
  }, [erroEtiquetasExistentes]);

  const [codigoBarras, setCodigoBarras] = useState("");
  const [etiquetas, setEtiquetas] = useState<EtiquetaLidaComLinha[]>([]);
  const [bipando, setBipando] = useState(false);
  const [flashingRowId, setFlashingRowId] = useState<string | null>(null);
  const [gerarModalOpen, setGerarModalOpen] = useState(false);

  const barrasRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jaCarregouExistentes = useRef(false);

  useEffect(() => {
    if (!numBonusValido) {
      toast.error("Número de bônus inválido");
      navigate("/recebimento-bonus", { replace: true });
    }
  }, [numBonusValido, navigate]);

  useEffect(() => {
    jaCarregouExistentes.current = false;
  }, [numBonus]);

  useEffect(() => {
    if (etiquetasExistentes && etiquetasExistentes.length > 0 && !jaCarregouExistentes.current) {
      jaCarregouExistentes.current = true;
      const existentes: EtiquetaLidaComLinha[] = etiquetasExistentes.map((e) => ({
        ...e,
        _rowId: `srv:${e.codigoBarras.trim()}\0${String(e.serie ?? "").trim()}\0${String(e.lote ?? "").trim()}`,
        _anterior: true,
      }));
      setEtiquetas((prev) => {
        const codigos = new Set(prev.map((p) => p.codigoBarras.trim()));
        const novas = existentes.filter((e) => !codigos.has(e.codigoBarras.trim()));
        return [...prev, ...novas];
      });
    }
  }, [etiquetasExistentes]);

  useEffect(() => {
    barrasRef.current?.focus();
  }, [numBonusValido]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const execBipar = useCallback(async (codigo: string) => {
    if (!numBonusValido || !codigo) return;

    setBipando(true);

    try {
      const result = await biparEtiqueta({
        codigoBarras: codigo,
        numBonus,
      });
      const rowId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      setEtiquetas((prev) => [{ ...result, _rowId: rowId }, ...prev]);
      setCodigoBarras("");
      playBeep(true);
      toast.success("Etiqueta bipada!");

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashingRowId(rowId);
      flashTimerRef.current = setTimeout(() => {
        setFlashingRowId(null);
        flashTimerRef.current = null;
      }, 2000);

      queryClient.refetchQueries({ queryKey: ["bonus-produtos", numBonus] }).catch(() => {});
    } catch (err: unknown) {
      playBeep(false);
      console.error("Erro ao bipar etiqueta:", err);

      const ax = err as {
        response?: { data?: unknown; status?: number };
        code?: string;
        message?: string;
      };
      const raw = ax?.response?.data;
      let msg = "Erro ao bipar etiqueta";

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
      throw err;
    } finally {
      setBipando(false);
      barrasRef.current?.focus();
    }
  }, [numBonus, numBonusValido, queryClient]);

  const handleBipar = useCallback(() => {
    execBipar(codigoBarras.trim()).catch(() => {});
  }, [codigoBarras, execBipar]);

  const handleBarrasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBipar();
    }
  };

  const handleEnviarAuditoria = async (nf: string, observacao: string) => {
    await enviarAuditoria({ numBonus, nf, observacao });
    toast.success("Enviado para auditoria com sucesso!");
    setEtiquetas([]);
    setCodigoBarras("");
    navigate("/recebimento-bonus");
  };

  if (!numBonusValido) return null;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/recebimento-bonus")}
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
            Voltar
          </button>
          <h1 className="min-w-0 flex-1 text-lg font-bold leading-tight text-[hsl(222_47%_11%)] sm:text-xl">
            <span className="text-[#1e40af]">Bônus #{numBonus}</span>
            <span className="text-muted-foreground"> — </span>
            <span>{tituloFornecedor}</span>
          </h1>
          {etiquetas.length > 0 && (
            <div className="flex w-full items-center justify-end sm:w-auto sm:flex-initial">
              <span className="rounded-full bg-[#1e40af]/10 px-4 py-1.5 text-sm font-semibold text-[#1e40af]">
                {etiquetas.length} etiqueta{etiquetas.length !== 1 ? "s" : ""} bipada
                {etiquetas.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        <BonusProdutosTable
          produtos={produtosLinhas}
          etiquetas={etiquetas}
          loading={produtosLoading}
          error={
            produtosErro && produtosErrorObj
              ? produtosErrorObj instanceof Error
                ? produtosErrorObj
                : new Error(String(produtosErrorObj))
              : null
          }
          onRetry={() => refetchProdutos()}
        />

        <div className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-[hsl(215_16%_47%)]">
              CÓDIGO DE BARRAS
            </label>
            <button 
              type="button" 
              onClick={() => setGerarModalOpen(true)}
              className="text-sm font-medium text-[#1e40af] hover:underline"
            >
              Etiqueta Ilegível? Gerar Nova
            </button>
          </div>
          <input
            ref={barrasRef}
            type="text"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            onKeyDown={handleBarrasKeyDown}
            placeholder="Escaneie ou digite e pressione Enter"
            className="industrial-input font-mono"
            autoComplete="off"
            disabled={bipando}
          />
        </div>

        <EtiquetaTable etiquetas={etiquetas} flashingRowId={flashingRowId} />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <AuditoriaButton
            disabled={etiquetas.length === 0}
            numBonus={numBonus}
            onConfirm={handleEnviarAuditoria}
          />
        </div>
      </main>

      <GerarEtiquetaModal 
        open={gerarModalOpen} 
        onOpenChange={setGerarModalOpen} 
        numBonus={numBonus}
        onBiparManual={execBipar}
      />
    </div>
  );
}
