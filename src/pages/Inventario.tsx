import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listarInventariosHoje, listarItensInventario } from "@/services/api";
import { InventarioModel } from "@/types/api";

export default function Inventario() {
  const navigate = useNavigate();
  const [selecionado, setSelecionado] = useState<InventarioModel | null>(null);

  const { data: invs = [], isLoading, isError } = useQuery({
    queryKey: ["inventarios-hoje"],
    queryFn: listarInventariosHoje,
    refetchInterval: 30000,
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ["inventario-itens", selecionado?.id],
    queryFn: () => selecionado ? listarItensInventario(selecionado.id) : Promise.resolve([]),
    enabled: !!selecionado,
  });

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(214_32%_91%)] bg-white shadow-sm">
        <div className="container flex max-w-6xl flex-wrap items-center gap-3 py-4">
          <button
            onClick={() => navigate("/")}
            className="industrial-btn-ghost !px-3 !py-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-[hsl(222_47%_11%)]">Monitor de Inventário</h1>
          <div className="ml-auto flex gap-2">
            <button onClick={() => navigate("/inventario/registro")} className="industrial-btn-ghost text-sm">Registro</button>
            <button onClick={() => navigate("/inventario/aprovacao")} className="industrial-btn-ghost text-sm">Aprovação</button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl space-y-6 py-6 font-sans">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Coluna Esquerda: Lista de Sessões */}
          <section className="md:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-700">Sessões de Hoje</h2>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Tempo Real"></div>
            </div>
            
            {isLoading && <div className="p-10 text-center text-gray-400">Carregando sessões...</div>}
            
            {!isLoading && invs.length === 0 && (
                <div className="p-10 text-center bg-white border border-dashed rounded-xl text-gray-400 italic">
                    Nenhum inventário hoje.
                </div>
            )}

            <div className="space-y-3">
                {invs.map(inv => (
                <button 
                    key={inv.id} 
                    onClick={() => setSelecionado(inv)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selecionado?.id === inv.id 
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-200' 
                        : 'bg-white hover:border-gray-300 hover:shadow-sm border-gray-200'
                    }`}
                >
                    <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-blue-900">Sessão #{inv.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                        inv.status === 'APROVADO' ? 'bg-green-100 text-green-700' : 
                        inv.status === 'ABERTO' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                    }`}>
                        {inv.status}
                    </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {inv.usuarioAbertura}
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-100 pt-2 mt-2">
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(inv.dataReferencia).toLocaleDateString()}</span>
                        <span className="text-sm font-bold text-gray-700">{inv.pesoTotal?.toFixed(2)} <small className="font-normal text-gray-400">kg</small></span>
                    </div>
                </button>
                ))}
            </div>
          </section>

          {/* Coluna Direita: Detalhes da Sessão */}
          <section className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-gray-700">Explorador de Materiais</h2>
            
            {!selecionado ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400 p-10">
                <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <p className="text-lg font-medium">Selecione uma sessão de inventário ao lado</p>
                <p className="text-sm">Os itens registrados aparecerão detalhados aqui.</p>
              </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-gray-50 border-b p-4 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Sessão Selecionada</span>
                            <h3 className="text-xl font-black text-gray-800">#{selecionado.id}</h3>
                        </div>
                        <div className="text-right">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Total Registrado</span>
                             <p className="text-xl font-black text-blue-600">{itens.length} <small className="text-xs font-normal">ITENS</small></p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loadingItens ? (
                            <div className="p-20 text-center text-gray-400">Carregando itens...</div>
                        ) : itens.length === 0 ? (
                            <div className="p-20 text-center text-gray-400 italic">Nenhum item nesta sessão ainda.</div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                                    <tr>
                                        <th className="px-6 py-3 uppercase tracking-widest text-[10px]">Produto</th>
                                        <th className="px-6 py-3 uppercase tracking-widest text-[10px]">Tipo</th>
                                        <th className="px-6 py-3 uppercase tracking-widest text-[10px]">Qtd</th>
                                        <th className="px-6 py-3 uppercase tracking-widest text-[10px]">Peso Est.</th>
                                        <th className="px-6 py-3 uppercase tracking-widest text-[10px]">Operador & Hora</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {itens.map(item => (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-700">{item.codProd}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                    item.statusEtiqueta === 'RETO' ? 'bg-blue-100 text-blue-700' :
                                                    item.statusEtiqueta === 'DOBRADO' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {item.statusEtiqueta}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-800">{item.quantidade}</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.peso?.toFixed(2) || '—'} kg</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-700 text-xs font-semibold">{item.codigoFuncionario}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(item.dataHoraBipagem).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
