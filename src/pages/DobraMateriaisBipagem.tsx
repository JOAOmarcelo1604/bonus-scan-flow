import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  biparDobra,
  COD_FILIAL_DOBRA,
  listarBonusDisponiveisDobra,
  listarProdutosBonus,
} from "@/services/api";
import type { BonusDisponivel, DobraRegistradaComLinha } from "@/types/api";
import { BonusProdutosTable } from "@/components/BonusProdutosTable";
import { playBeep } from "@/lib/beep";
import { normalizarListaProdutosBonus } from "@/lib/bonusProduto";

function nomeFornecedorCard(fornecedorCompleto: string) {
  const idx = fornecedorCompleto.indexOf(" - ");
  if (idx === -1) return fornecedorCompleto.trim();
  return fornecedorCompleto.slice(idx + 3).trim() || fornecedorCompleto;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  D: { label: "DOBRADO", className: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  R: { label: "RETO", className: "bg-blue-100 text-blue-800 border border-blue-300" },
  S: { label: "SOLTO", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" },
  P: { label: "SEPARADO", className: "bg-purple-100 text-purple-800 border border-purple-300" },
};

export default function DobraMateriaisBipagem() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { numBonus: numBonusParam } = useParams<{ numBonus: string }>();
  const location = useLocation();
  const stateBonus = (location.state as { bonus?: BonusDisponivel } | null)?.bonus;

  const numBonus = Number(numBonusParam);
  const numBonusValido = Number.isFinite(numBonus) && numBonus > 0;

  const { data: listaBonus } = useQuery({
    queryKey: ["bonus-disponiveis-dobra", COD_FILIAL_DOBRA],
    queryFn: () => listarBonusDisponiveisDobra(COD_FILIAL_DOBRA),
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

  const [codigoBarras, setCodigoBarras] = useState("");
  const [qtBarras, setQtBarras] = useState<string>("");
  const [dobras, setDobras] = useState<DobraRegistradaComLinha[]>([]);
  const [bipando, setBipando] = useState(false);
  const [flashingRowId, setFlashingRowId] = useState<string | null>(null);

  const barrasRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!numBonusValido) {
      toast.error("Número de bônus inválido");
      navigate("/dobra-materiais", { replace: true });
    }
  }, [numBonusValido, navigate]);

  useEffect(() => {
    barrasRef.current?.focus();
  }, [numBonusValido]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleBipar = useCallback(async () => {
    const codigo = codigoBarras.trim();
    const qtBarrasNum = Number(qtBarras);

    if (!numBonusValido || !codigo) return;

    if (!qtBarrasNum || qtBarrasNum <= 0) {
      toast.error("Informe uma quantidade de barras válida");
      return;
    }

    setBipando(true);

    try {
      const result = await biparDobra({
        codigoBarras: codigo,
        numBonus,
        qtBarras: qtBarrasNum,
      });
      const rowId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const reg = result.dobraRegistrada;
      setDobras((prev) => [{ ...reg, _rowId: rowId }, ...prev]);
      setCodigoBarras("");
      playBeep(true);
      toast.success("Dobra registrada!");

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashingRowId(rowId);
      flashTimerRef.current = setTimeout(() => {
        setFlashingRowId(null);
        flashTimerRef.current = null;
      }, 2000);

      queryClient.refetchQueries({ queryKey: ["bonus-produtos", numBonus] }).catch(() => {});
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
      barrasRef.current?.focus();
    }
  }, [codigoBarras, qtBarras, numBonus, numBonusValido, queryClient]);

  const handleBarrasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBipar();
    }
  };

  if (!numBonusValido) return null;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => navigate("/dobra-materiais")}
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
            <span className="text-[#1e40af]">Dobra #{numBonus}</span>
            <span className="text-muted-foreground"> — </span>
            <span>{tituloFornecedor}</span>
          </h1>
          {dobras.length > 0 && (
            <div className="flex w-full items-center justify-end sm:w-auto sm:flex-initial">
              <span className="rounded-full bg-[#1e40af]/10 px-4 py-1.5 text-sm font-semibold text-[#1e40af]">
                {dobras.length} dobra{dobras.length !== 1 ? "s" : ""} registrada
                {dobras.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        <BonusProdutosTable
          produtos={produtosLinhas}
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
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-[hsl(215_16%_47%)]">
              QUANTIDADE DE BARRAS
            </label>
            <input
              type="number"
              min="1"
              value={qtBarras}
              onChange={(e) => setQtBarras(e.target.value)}
              placeholder="Ex: 10"
              className="industrial-input max-w-xs"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[hsl(215_16%_47%)]">
              CÓDIGO DE BARRAS
            </label>
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
        </div>

        {dobras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[hsl(214_32%_91%)] bg-white p-8 text-center text-lg text-muted-foreground">
            Nenhuma dobra registrada ainda. Escaneie um código de barras acima.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[hsl(214_32%_91%)] bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-[hsl(214_32%_91%)] bg-[hsl(210_40%_96%)]">
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Código de Barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Produto</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Lote</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Série</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Peso</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Qtd Barras</th>
                  <th className="px-4 py-3 font-semibold text-[hsl(215_16%_35%)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {dobras.map((d) => {
                  const flash = flashingRowId === d._rowId;
                  const statusInfo = STATUS_MAP[d.status] ?? { label: d.status, className: "bg-muted text-muted-foreground" };
                  return (
                    <tr
                      key={d._rowId}
                      className={`border-b border-[hsl(214_32%_91%)] last:border-0 ${
                        flash
                          ? "bg-emerald-100/95 transition-colors duration-300"
                          : "even:bg-[hsl(210_40%_98%)]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs md:text-sm">{d.codigoBarras}</td>
                      <td className="px-4 py-3 font-medium">{d.codProd}</td>
                      <td className="px-4 py-3">{d.numLote}</td>
                      <td className="px-4 py-3">{d.serie}</td>
                      <td className="px-4 py-3 tabular-nums">{d.pesoTotal}</td>
                      <td className="px-4 py-3 tabular-nums">{d.qtBarras}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
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
