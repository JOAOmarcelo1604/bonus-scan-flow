import { useNavigate } from "react-router-dom";

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
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container py-6">
          <h1 className="text-2xl font-bold text-foreground">Sistema de Expedição</h1>
          <p className="mt-1 text-sm text-muted-foreground">Selecione um módulo para continuar</p>
        </div>
      </header>

      {/* Cards */}
      <main className="container flex-1 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
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
