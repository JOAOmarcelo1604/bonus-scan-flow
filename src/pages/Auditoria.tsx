import { useNavigate } from "react-router-dom";
import { AuditoriaList } from "@/components/AuditoriaList";

export default function Auditoria() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
        <div className="container flex items-center gap-4 py-4">
          <button onClick={() => navigate("/")} className="industrial-btn-ghost !px-3 !py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Voltar
          </button>
          <h1 className="text-xl font-bold text-foreground">Auditorias</h1>
        </div>
      </header>
      <main className="container max-w-4xl py-6 animate-slide-up">
        <AuditoriaList />
      </main>
    </div>
  );
}
