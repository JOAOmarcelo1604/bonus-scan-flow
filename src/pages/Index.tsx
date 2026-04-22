import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { listarModulosUsuario } from "@/services/api";

// Matrículas que podem acessar o módulo "Controle de Acesso"
// 471 = JOAO MARCELO, 336 = CESAR FELIPE, 477 = código JWT do JOAO MARCELO
export const ADMIN_CODES = ["471", "336", "477"];

interface NavCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const cards: NavCard[] = [
  {
    title: "Recebimento Bônus",
    description: "Bipagem de etiquetas e envio para auditoria",
    path: "/recebimento-bonus",
    color: "bg-primary/10 text-primary",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8V6a2 2 0 012-2h3"/><path d="M17 4h3a2 2 0 012 2v2"/><path d="M22 16v2a2 2 0 01-2 2h-3"/><path d="M7 20H4a2 2 0 01-2-2v-2"/>
        <line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/>
      </svg>
    ),
  },
  {
    title: "Auditorias",
    description: "Consulta de auditorias e status",
    path: "/auditoria",
    color: "bg-success/10 text-success",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    title: "Aprovação Bônus",
    description: "Aprovar ou rejeitar auditorias pendentes",
    path: "/aprovacao-bonus",
    color: "bg-warning/15 text-warning",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/><path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/><path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3"/><path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3"/>
      </svg>
    ),
  },
  {
    title: "Dobra de Materiais",
    description: "Registro de dobras de materiais por bônus",
    path: "/dobra-materiais",
    color: "bg-[#7c3aed]/10 text-[#7c3aed]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18"/><path d="M8 6l4-3 4 3"/><path d="M8 18l4 3 4-3"/><rect x="3" y="8" width="18" height="8" rx="1"/>
      </svg>
    ),
  },
  {
    title: "Abertura de Materiais",
    description: "Registro da abertura de etiquetas cegas",
    path: "/abertura-material",
    color: "bg-[#0ea5e9]/10 text-[#0ea5e9]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3z"/><path d="M12 8v8"/><path d="M8 12h8"/>
      </svg>
    ),
  },
  {
    title: "Inventário — consulta",
    description: "Resumo e lista (GET /api/inventario)",
    path: "/inventario",
    color: "bg-[#0891b2]/10 text-[#0891b2]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h7v7h-7z"/>
      </svg>
    ),
  },
  {
    title: "Registro de inventário",
    description: "Bipar etiquetas e enviar para aprovação",
    path: "/inventario/registro",
    color: "bg-[#0d9488]/10 text-[#0d9488]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14"/><path d="M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    title: "Aprovação de inventário",
    description: "Aprovar ou reprovar itens pendentes",
    path: "/inventario/aprovacao",
    color: "bg-[#c2410c]/10 text-[#c2410c]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
      </svg>
    ),
  },
  {
    title: "Solicitações de Etiquetas",
    description: "Fila de etiquetas pendentes de geração",
    path: "/solicitacoes-etiqueta",
    color: "bg-indigo-100 text-indigo-700",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    title: "Separação de Volumes",
    description: "Gerar e imprimir etiquetas de volumes por pedido",
    path: "/separacao",
    color: "bg-[#b45309]/10 text-[#b45309]",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l2-1.14"/>
        <path d="M16.5 9.4L7.55 4.24"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
        <circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27L22 19"/>
      </svg>
    ),
  },
  {
    title: "Controle de Acesso",
    description: "Gerenciar permissões de usuários",
    path: "/controle-acesso",
    color: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [modulosPermitidos, setModulosPermitidos] = useState<string[] | null>(null);

  useEffect(() => {
    if (user?.userCode) {
      listarModulosUsuario(Number(user.userCode))
        .then(modulos => setModulosPermitidos(modulos))
        .catch(err => {
          console.error("Erro ao carregar permissões", err);
          // Se falhar o backend, deixamos todos liberados (null) temporariamente
          setModulosPermitidos(null);
        });
    }
  }, [user]);

  const isAdmin = ADMIN_CODES.includes(user?.userCode ?? "");

  // Se modulosPermitidos for null (erro/carregando) ou vazio [] (nenhuma permissão cadastrada),
  // mostra todos os módulos. Só restringe quando há permissões EXPLICITAMENTE configuradas.
  const visibleCards = cards.filter(card => {
    // Controle de acesso só aparece para admins
    if (card.path === "/controle-acesso") return isAdmin;
    if (!modulosPermitidos || modulosPermitidos.length === 0) return true; 
    return modulosPermitidos.includes(card.title);
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container flex items-center justify-between py-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sistema de Expedição</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecione um módulo para continuar</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{user.userCode}</span>
                {" · Filial "}
                {user.companyCode}
              </span>
            )}
            <ThemeToggle />
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Cards */}
      <main className="container flex-1 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCards.map((card, i) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              className="animate-slide-up group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 text-left shadow-md transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`rounded-lg p-3 ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
