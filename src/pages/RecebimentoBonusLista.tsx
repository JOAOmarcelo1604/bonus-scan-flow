import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { COD_FILIAL_RECEBIMENTO_BONUS, listarBonusDisponiveis } from "@/services/api";
import type { BonusDisponivel } from "@/types/api";

function formatarData(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function RecebimentoBonusLista() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const { data: bonus = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bonus-disponiveis", COD_FILIAL_RECEBIMENTO_BONUS],
    queryFn: () => listarBonusDisponiveis(COD_FILIAL_RECEBIMENTO_BONUS),
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return bonus;
    return bonus.filter((b) => {
      const num = String(b.NUMBONUS);
      const forn = (b.FORNECEDOR || "").toLowerCase();
      return num.includes(q) || forn.includes(q);
    });
  }, [bonus, busca]);

  const entrar = (b: BonusDisponivel) => {
    navigate(`/recebimento-bonus/${b.NUMBONUS}`, { state: { bonus: b } });
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl items-center gap-4 py-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="industrial-btn-ghost !px-3 !py-2"
            aria-label="Início"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[hsl(222_47%_11%)] sm:text-2xl">
            Recebimento Bônus
          </h1>
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[hsl(215_16%_47%)]">
            Buscar por número ou fornecedor
          </label>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: 26667 ou GERDAU"
            className="industrial-input max-w-xl"
            autoComplete="off"
          />
        </div>

        {isLoading && (
          <p className="text-center text-lg text-muted-foreground">Carregando bônus…</p>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">
              {axios.isAxiosError(error)
                ? (typeof error.response?.data === "string"
                    ? error.response.data
                    : error.message)
                : error instanceof Error
                  ? error.message
                  : "Erro ao carregar bônus disponíveis."}
            </p>
            <button type="button" onClick={() => refetch()} className="industrial-btn-primary mt-4">
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && filtrados.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
            {busca.trim()
              ? "Nenhum bônus encontrado para esta busca."
              : "Nenhum bônus disponível no momento."}
          </div>
        )}

        <ul className="grid gap-4 md:grid-cols-2">
          {filtrados.map((b) => (
            <li
              key={b.NUMBONUS}
              className="flex flex-col rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-3xl font-bold tabular-nums text-[#1e40af] sm:text-4xl">
                {b.NUMBONUS}
              </p>
              <p className="mt-2 text-sm font-medium leading-snug text-[hsl(222_47%_11%)]">
                {b.FORNECEDOR}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-[hsl(215_16%_47%)]">
                <div>
                  <dt className="font-semibold text-[hsl(222_47%_11%)]">Data do bônus</dt>
                  <dd>{formatarData(b.DATABONUS)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[hsl(222_47%_11%)]">Peso total</dt>
                  <dd className="tabular-nums">{b.PESOTOTAL}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => entrar(b)}
                className="industrial-btn-primary mt-6 w-full"
              >
                ENTRAR
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
