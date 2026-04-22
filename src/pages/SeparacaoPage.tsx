import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "axios";
import { consultarPedidoSeparacao, gerarVolumesSeparacao, listarVolumesSeparacao } from "@/services/api";
import { playBeep } from "@/lib/beep";
import { useAuth } from "@/contexts/AuthContext";
import type { PedidoSeparacaoItem, VolumeGerado } from "@/types/api";

async function listarImpressoras(): Promise<string[]> {
  const res = await axios.get<{ impressoras: string[] }>("https://api.etiquetas.grupopapa.com/v1/impressoras");
  return res.data.impressoras ?? [];
}

export default function SeparacaoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [inputPedido, setInputPedido] = useState("");
  const [numPedConfirmado, setNumPedConfirmado] = useState<number | null>(null);
  const [qtdVolumes, setQtdVolumes] = useState<number>(1);
  const [impressora, setImpressora] = useState("");
  const [volumesGerados, setVolumesGerados] = useState<VolumeGerado[]>([]);

  const pedidoRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);

  const { data: impressoras = [], isLoading: carregandoImpressoras } = useQuery({
    queryKey: ["impressoras"],
    queryFn: listarImpressoras,
    staleTime: 60_000,
  });

  // Define a primeira impressora disponível como padrão
  useEffect(() => {
    if (impressoras.length > 0 && !impressora) {
      setImpressora(impressoras[0]);
    }
  }, [impressoras, impressora]);

  useEffect(() => {
    pedidoRef.current?.focus();
  }, []);

  // Consulta itens do pedido no WinThor
  const { data: itensPedido = [], isFetching: buscandoPedido } = useQuery<PedidoSeparacaoItem[]>({
    queryKey: ["separacao-pedido", numPedConfirmado],
    queryFn: () => consultarPedidoSeparacao(numPedConfirmado!),
    enabled: numPedConfirmado !== null,
    retry: false,
    staleTime: 30_000,
  });

  // Lista volumes já gerados para o pedido
  const { data: volumesExistentes = [], refetch: refetchVolumes } = useQuery({
    queryKey: ["separacao-volumes", numPedConfirmado],
    queryFn: () => listarVolumesSeparacao(numPedConfirmado!),
    enabled: numPedConfirmado !== null,
  });

  const gerarMut = useMutation({
    mutationFn: () =>
      gerarVolumesSeparacao({
        numPed: numPedConfirmado!,
        quantidadeVolumes: qtdVolumes,
        impressora,
        usuario: user?.userCode || "SISTEMA",
      }),
    onSuccess: (data) => {
      setVolumesGerados(data);
      refetchVolumes();
      playBeep(880, 120);
      toast.success(`${data.length} volume(s) gerado(s) e enviados para impressão!`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao gerar volumes.";
      playBeep(220, 300);
      toast.error(msg);
    },
  });

  const handleConfirmarPedido = useCallback(() => {
    const num = parseInt(inputPedido.trim(), 10);
    if (isNaN(num) || num <= 0) {
      toast.error("Número de pedido inválido.");
      return;
    }
    setVolumesGerados([]);
    setNumPedConfirmado(num);
    setTimeout(() => qtdRef.current?.focus(), 100);
  }, [inputPedido]);

  const handleKeyDownPedido = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmarPedido();
  };

  const cabecalho = itensPedido[0];

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-bold">Etiquetas de Separação</h1>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">

        {/* Input flutuante de pedido */}
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Bipe ou digite o número do pedido (mapa de separação)</p>
          <div className="flex gap-2">
            <input
              ref={pedidoRef}
              type="text"
              inputMode="numeric"
              value={inputPedido}
              onChange={(e) => setInputPedido(e.target.value)}
              onKeyDown={handleKeyDownPedido}
              placeholder="Número do pedido..."
              className="flex-1 border rounded px-3 py-2 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleConfirmarPedido}
              disabled={buscandoPedido}
              className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
            >
              {buscandoPedido ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Dados do pedido */}
        {cabecalho && (
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Pedido #{cabecalho.numPed}</h2>
              <span className="text-xs bg-muted px-2 py-1 rounded">{cabecalho.tipoEntrega}</span>
            </div>
            <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> {cabecalho.codCli} — {cabecalho.cliente}</p>
            <p className="text-sm"><span className="text-muted-foreground">Cidade:</span> {cabecalho.cidade}</p>
            {cabecalho.observacao && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Obs: {cabecalho.observacao}</p>
            )}

            {/* Itens de ferro */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2 border">Cód. Produto</th>
                    <th className="text-left p-2 border">Descrição</th>
                    <th className="text-right p-2 border">Qtd</th>
                    <th className="text-right p-2 border">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPedido.map((item, i) => (
                    <tr key={i} className="even:bg-muted/30">
                      <td className="p-2 border font-mono">{item.codProd}</td>
                      <td className="p-2 border">{item.descricao}</td>
                      <td className="p-2 border text-right">{item.qt}</td>
                      <td className="p-2 border text-right">
                        {Number(item.pvenda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Geração de volumes */}
        {numPedConfirmado !== null && itensPedido.length > 0 && (
          <div className="bg-card border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Gerar Volumes</h3>

            {volumesExistentes.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded p-3 text-sm text-yellow-800 dark:text-yellow-300">
                Atenção: já existem <strong>{volumesExistentes.length}</strong> volume(s) gerados para este pedido.
                Gerar novamente será bloqueado pelo sistema.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Quantidade de volumes</label>
                <input
                  ref={qtdRef}
                  type="number"
                  min={1}
                  max={999}
                  value={qtdVolumes}
                  onChange={(e) => setQtdVolumes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border rounded px-3 py-2 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Impressora</label>
                <select
                  value={impressora}
                  onChange={(e) => setImpressora(e.target.value)}
                  disabled={carregandoImpressoras}
                  className="w-full border rounded px-3 py-2 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {carregandoImpressoras
                    ? <option>Carregando...</option>
                    : impressoras.map((p) => <option key={p} value={p}>{p}</option>)
                  }
                </select>
              </div>
            </div>

            <button
              onClick={() => gerarMut.mutate()}
              disabled={gerarMut.isPending || volumesExistentes.length > 0}
              className="w-full py-3 bg-primary text-primary-foreground rounded font-semibold text-base disabled:opacity-50"
            >
              {gerarMut.isPending
                ? "Gerando e imprimindo..."
                : volumesExistentes.length > 0
                  ? "Volumes já gerados"
                  : `Gerar ${qtdVolumes} Volume(s) e Imprimir`}
            </button>
          </div>
        )}

        {/* Volumes gerados na sessão atual */}
        {volumesGerados.length > 0 && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-green-600 dark:text-green-400">
              ✓ {volumesGerados.length} Volume(s) gerados — Pedido #{volumesGerados[0].numPed}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-center p-2 border">Volume</th>
                    <th className="text-left p-2 border">Código QR</th>
                  </tr>
                </thead>
                <tbody>
                  {volumesGerados.map((v) => (
                    <tr key={v.id} className="even:bg-muted/30">
                      <td className="p-2 border text-center font-bold">
                        {v.numeroVolume} / {v.totalVolumes}
                      </td>
                      <td className="p-2 border font-mono text-xs">{v.codigoVolume}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Volumes existentes no banco */}
        {volumesExistentes.length > 0 && volumesGerados.length === 0 && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Volumes existentes — Pedido #{numPedConfirmado}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-center p-2 border">Vol.</th>
                    <th className="text-left p-2 border">Código QR</th>
                    <th className="text-center p-2 border">Inventário</th>
                    <th className="text-center p-2 border">Saída</th>
                    <th className="text-left p-2 border">Gerado por</th>
                  </tr>
                </thead>
                <tbody>
                  {volumesExistentes.map((v) => (
                    <tr key={v.id} className="even:bg-muted/30">
                      <td className="p-2 border text-center font-bold">{v.numeroVolume}</td>
                      <td className="p-2 border font-mono">{v.codigoVolume}</td>
                      <td className="p-2 border text-center">
                        <span className={v.statusInventario ? "text-green-600 font-bold" : "text-muted-foreground"}>
                          {v.statusInventario ? "Bipado" : "Pendente"}
                        </span>
                      </td>
                      <td className="p-2 border text-center">
                        <span className={v.statusSaida ? "text-blue-600 font-bold" : "text-muted-foreground"}>
                          {v.statusSaida ? "Saiu" : "No pátio"}
                        </span>
                      </td>
                      <td className="p-2 border">{v.usuarioGeracao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {numPedConfirmado !== null && !buscandoPedido && itensPedido.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            Nenhum item de ferro encontrado para o pedido {numPedConfirmado}.<br />
            <span className="text-xs">(Verifique LOCALSEPARACAO=EF e CODSEC=101)</span>
          </div>
        )}
      </div>
    </div>
  );
}
