import { useState, useEffect } from "react";
import { listarUsuariosWinthor, listarModulosUsuario, salvarModulosUsuario, type UsuarioWinthor } from "@/services/api";
import { toast } from "sonner";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_CODES } from "./Index";

export const MODULOS_SISTEMA = [
  "Recebimento Bônus",
  "Auditorias",
  "Aprovação Bônus",
  "Dobra de Materiais",
  "Abertura de Materiais",
  "Separação de Volumes",
  "Inventário — consulta",
  "Registro de inventário",
  "Aprovação de inventário",
  "Solicitações de Etiquetas",
  "Rel. Inventário por Bitola",
  "Rel. Auditoria de Estoque",
  "Reimpressão de Etiquetas",
];

export default function ControleAcesso() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Bloqueia acesso para não-admins
  if (!user || !ADMIN_CODES.includes(user.userCode)) {
    return <Navigate to="/" replace />;
  }

  const [usuarios, setUsuarios] = useState<UsuarioWinthor[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState<UsuarioWinthor | null>(null);
  const [modulosAtivos, setModulosAtivos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const usuariosFiltrados = usuarios.filter(u => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return true;
    return (
      u.nome.toLowerCase().includes(termo) ||
      String(u.matricula).includes(termo)
    );
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoadingUsers(true);
    try {
      const data = await listarUsuariosWinthor();
      setUsuarios(data);
    } catch (error: any) {
      console.error(error);
      const serverMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      toast.error("Falha banco: " + serverMsg, { duration: 10000 });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleSelectUser(user: UsuarioWinthor) {
    setSelectedUser(user);
    try {
      const mods = await listarModulosUsuario(user.matricula);
      setModulosAtivos(mods || []);
    } catch (err) {
      toast.error("Erro ao carregar os módulos deste usuário");
      setModulosAtivos([]);
    }
  }

  function toggleModulo(modulo: string) {
    setModulosAtivos(prev => 
      prev.includes(modulo) 
        ? prev.filter(m => m !== modulo)
        : [...prev, modulo]
    );
  }

  async function handleSave() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await salvarModulosUsuario(selectedUser.matricula, modulosAtivos);
      toast.success("Permissões atualizadas com sucesso!");
    } catch (error) {
      toast.error("Falha ao salvar as permissões");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container flex items-center gap-4 py-4">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-2 hover:bg-accent hover:text-accent-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Controle de Acesso</h1>
            <p className="text-sm text-muted-foreground">Gerenciar acesso aos módulos do sistema</p>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6 grid gap-6 md:grid-cols-[1fr,2fr]">
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Usuários (Winthor)</h2>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por nome ou matrícula..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="industrial-input pl-10 w-full"
            />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loadingUsers ? (
              <div className="p-8 text-center text-muted-foreground">Carregando usuários...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {busca ? "Nenhum usuário encontrado para essa busca." : "Nenhum usuário encontrado."}
              </div>
            ) : (
              <div className="flex flex-col max-h-[600px] overflow-y-auto divide-y divide-border">
                {usuariosFiltrados.map(u => (
                  <button
                    key={u.matricula}
                    onClick={() => handleSelectUser(u)}
                    className={`flex flex-col items-start gap-1 p-3 text-left transition-colors hover:bg-accent/50 ${selectedUser?.matricula === u.matricula ? 'bg-accent/80' : ''}`}
                  >
                    <span className="font-medium">{u.nome}</span>
                    <span className="text-xs text-muted-foreground">Matrícula: {u.matricula}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Permissões de Módulo</h2>
          {!selectedUser ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Selecione um usuário para gerenciar suas permissões.
            </div>
          ) : (
            <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="border-b border-border pb-4">
                <h3 className="text-lg font-bold text-foreground">{selectedUser.nome}</h3>
                <p className="text-sm text-muted-foreground">Matrícula: {selectedUser.matricula}</p>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                {MODULOS_SISTEMA.map(modulo => {
                  const isActive = modulosAtivos.includes(modulo);
                  return (
                    <label key={modulo} className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50'}`}>
                      <span className="text-sm font-medium">{modulo}</span>
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-input text-primary focus:ring-primary"
                        checked={isActive}
                        onChange={() => toggleModulo(modulo)}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="industrial-btn-primary px-6"
                >
                  {saving ? "Salvando..." : "Salvar Permissões"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
