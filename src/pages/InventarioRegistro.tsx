import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  abrirInventario,
  carregarInventarioRegistroPagina,
  enviarInventarioAprovacao,
  registrarItemInventario,
} from "@/services/api";
import { playBeep } from "@/lib/beep";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_OPCOES = [
  { value: "RETO", label: "RETO (Etiqueta)" },
  { value: "DOBRADO", label: "DOBRADO (Etiqueta)" },
  { value: "SOLTO", label: "SOLTO (Manual)" },
  { value: "SEPARADO", label: "SEPARADO (QR Code)" },
] as const;

const REGISTRO_KEY = ["inventario-registro"] as const;

export default function InventarioRegistro() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [statusBip, setStatusBip] = useState<string>("RETO");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [codProd, setCodProd] = useState("");
  const [quantidade, setQuantidade] = useState<number>(1);
  
  const [processando, setProcessando] = useState(false);
  const barrasRef = useRef<HTMLInputElement>(null);

  const {
    data: pagina,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: REGISTRO_KEY,
    queryFn: carregarInventarioRegistroPagina,
    refetchInterval: 10000,
  });

  const ativo = pagina?.ativo;
  const itens = pagina?.itens ?? [];
  const resumo = pagina?.resumo;

  useEffect(() => {
    if (ativo) {
        barrasRef.current?.focus();
    }
  }, [ativo]);

  const abrirMut = useMutation({
    mutationFn: () => abrirInventario(user?.userCode || "SISTEMA"),
    onSuccess: () => {
      toast.success("Inventário iniciado!");
      queryClient.invalidateQueries({ queryKey: REGISTRO_KEY });
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: unknown } }).response?.data === "string"
          ? String((err as { response: { data: string } }).response.data)
          : "Erro ao iniciar inventário.";
      toast.error(msg);
    },
  });

  const enviarAprovacaoMut = useMutation({
    mutationFn: (id: number) => enviarInventarioAprovacao(id),
    onSuccess: () => {
      toast.success("Inventário enviado para aprovação.");
      queryClient.invalidateQueries({ queryKey: REGISTRO_KEY });
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: unknown } }).response?.data === "string"
          ? String((err as { response: { data: string } }).response.data)
          : "Erro ao enviar para aprovação.";
      toast.error(msg);
    },
  });

  const handleRegistrar = useCallback(async () => {
    if (!ativo) return;

    const usuario = user?.userCode || "SISTEMA";
    setProcessando(true);

    try {
      const codigo = codigoBarras.trim();
      let payload: any;

      // QR Code de volume de separação — detectado pelo prefixo independente do modo
      if (codigo.startsWith("SEP-")) {
        payload = { codigoBarras: codigo, status: "SEPARADO" };
      } else if (statusBip === "RETO" || statusBip === "DOBRADO") {
        if (!codigo) {
          toast.error("Informe a etiqueta.");
          return;
        }
        payload = { status: statusBip, codigoBarras: codigo };
      } else {
        // SOLTO — entrada manual (nunca enviar código de barras; limpa estado residual do modo etiqueta)
        setCodigoBarras("");
        if (!codProd.trim()) {
          toast.error("Informe o produto.");
          return;
        }
        payload = { status: "SOLTO", codProd: codProd.trim(), quantidade };
      }

      await registrarItemInventario(ativo.id, payload, usuario);

      playBeep(true);
      toast.success("Registrado com sucesso!");
      setCodigoBarras("");
      queryClient.invalidateQueries({ queryKey: REGISTRO_KEY });
    } catch (err: any) {
      playBeep(false);
      const msg = err.response?.data || "Erro ao registrar.";
      toast.error(typeof msg === 'string' ? msg : "Erro no registro.");
    } finally {
      setProcessando(false);
      barrasRef.current?.focus();
    }
  }, [ativo, codigoBarras, codProd, quantidade, statusBip, user, queryClient]);

  if (isLoading) return <div className="p-10 text-center">Carregando inventário...</div>;

  const isManual = statusBip === "SOLTO";

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-5xl flex-wrap items-center gap-3 py-4">
          <button onClick={() => navigate("/")} className="industrial-btn-ghost shrink-0 !px-3 !py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)]">Inventário de Vergalhões</h1>
          <div className="ml-auto flex gap-2">
            <button onClick={() => navigate("/inventario/aprovacao")} className="industrial-btn-ghost text-sm">
              Visão Supervisor
            </button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl space-y-6 py-6">
        {!ativo ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-10 text-center">
            <h2 className="mb-2 text-xl font-bold text-blue-900">Nenhum Inventário Ativo</h2>
            <p className="mb-6 text-blue-800">Inicie uma nova contagem para começar a registrar os materiais.</p>
            <button
                disabled={abrirMut.isPending}
                onClick={() => abrirMut.mutate()}
                className="industrial-btn-primary"
            >
              {abrirMut.isPending ? "Iniciando..." : "Iniciar Inventário de Hoje"}
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Registro de Materiais</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  ID SESSÃO: #{ativo.id}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-full border-b pb-4">
                  <label className="mb-1 block text-sm font-semibold text-muted-foreground">Tipo de Contagem</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPCOES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                            setStatusBip(opt.value);
                            setCodigoBarras("");
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                          statusBip === opt.value
                            ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo de scan sempre visível — detecta SEP- automaticamente */}
                {statusBip !== "SOLTO" && (
                  <div className="col-span-full">
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                      Código de Barras / QR Code
                    </label>
                    <div className="relative">
                      <input
                        ref={barrasRef}
                        type="text"
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRegistrar()}
                        className="industrial-input w-full font-mono text-lg"
                        placeholder="Bipe a etiqueta ou QR Code de volume..."
                        autoFocus
                      />
                      {codigoBarras.startsWith("SEP-") && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          SEPARAÇÃO
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {isManual && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">Código Produto (Simplex)</label>
                      <input
                        type="text"
                        value={codProd}
                        onChange={(e) => setCodProd(e.target.value)}
                        className="industrial-input w-full"
                        placeholder="Ex: 12345"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">Quant. Barras</label>
                      <input
                        type="number"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Number(e.target.value))}
                        className="industrial-input w-full"
                        min={1}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  disabled={processando}
                  onClick={handleRegistrar}
                  className="industrial-btn-primary min-w-[120px]"
                >
                  {processando ? "Salvando..." : "Registrar"}
                </button>
                <button
                  disabled={enviarAprovacaoMut.isPending}
                  onClick={() => {
                    if (window.confirm("Deseja finalizar a contagem e enviar para aprovação?")) {
                        enviarAprovacaoMut.mutate(ativo.id);
                    }
                  }}
                  className="industrial-btn-success ml-auto"
                >
                  Finalizar Inventário
                </button>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
               {[
                 { label: "RETO", count: resumo?.reto || 0, color: "blue" },
                 { label: "DOBRADO", count: resumo?.dobrado || 0, color: "emerald" },
                 { label: "SOLTO", count: resumo?.solto || 0, color: "amber" },
                 { label: "SEPARADO", count: resumo?.separado || 0, color: "purple" },
               ].map((c) => (
                 <div key={c.label} className={`rounded-xl border-2 border-${c.color}-200 bg-${c.color}-50 p-4`}>
                    <p className={`text-xs font-bold uppercase text-${c.color}-700`}>{c.label}</p>
                    <p className={`text-3xl font-bold text-${c.color}-900`}>{c.count}</p>
                 </div>
               ))}
            </div>

            <section className="rounded-xl border border-[hsl(214_32%_91%)] bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-md font-bold text-muted-foreground">Últimos Registros (Sessão #{ativo.id})</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-2 font-semibold">Produto</th>
                                <th className="px-4 py-2 font-semibold">Tipo</th>
                                <th className="px-4 py-2 font-semibold">Qtd</th>
                                <th className="px-4 py-2 font-semibold">Etiqueta/Pedido</th>
                                <th className="px-4 py-2 font-semibold">Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {itens.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-400 italic">Nenhum registro nesta sessão</td></tr>
                            ) : (
                                [...itens].reverse().slice(0, 10).map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium">{item.codProd}</td>
                                        <td className="px-4 py-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                item.statusEtiqueta === 'RETO' ? 'bg-blue-100 text-blue-700' :
                                                item.statusEtiqueta === 'DOBRADO' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {item.statusEtiqueta}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-bold">{item.quantidade}</td>
                                        <td className="px-4 py-2 text-xs font-mono">
                                            {item.etiqueta?.startsWith("MAN-")
                                                ? "Manual"
                                                : item.etiqueta || (item.numPed ? `PED: ${item.numPed}` : "N/A")}
                                        </td>
                                        <td className="px-4 py-2 text-gray-400">
                                            {new Date(item.dataHoraBipagem).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
